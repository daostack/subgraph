require('dotenv').config();
const IPFSClient = require('ipfs-http-client');

process.env = {
  ethereum: 'http://127.0.0.1:8545',
  ipfs: '/ip4/127.0.0.1/tcp/5001',
  node_http: 'http://127.0.0.1:8000/subgraphs/name/daostack',
  node_ws: 'http://127.0.0.1:8001/subgraphs/name/daostack',
  test_mnemonic:
    'myth like bonus scare over problem client lizard pioneer submit female collect',
  ...process.env,
};

const { execute } = require('apollo-link');
const { WebSocketLink } = require('apollo-link-ws');
const { SubscriptionClient } = require('subscriptions-transport-ws');
const ws = require('ws');
import axios from 'axios';
import * as HDWallet from 'hdwallet-accounts';
const Web3 = require('web3');

const { node_ws, node_http, ethereum, ipfs, test_mnemonic } = process.env;

export async function sendQuery(q: string, maxDelay = 1000, url = node_http) {
  await new Promise((res, rej) => setTimeout(res, maxDelay));
  const {
    data: { data },
  } = await axios.post(url, {
    query: q,
  });

  return data;
}

export const addressLength = 40;
export const hashLength = 64;
export const nullAddress = '0x0000000000000000000000000000000000000000';
export const nullParamsHash = '0x' + padZeros('', 64);

export async function getWeb3() {
  const web3 = new Web3(ethereum);
  const hdwallet = HDWallet(10, test_mnemonic);
  Array(10)
    .fill(10)
    .map((_, i) => i)
    .forEach((i) => {
      const pk = hdwallet.accounts[i].privateKey;
      const account = web3.eth.accounts.privateKeyToAccount(pk);
      web3.eth.accounts.wallet.add(account);
    });
  web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;
  return web3;
}

export function getContractAddresses() {
  const addresses = require(`@daostack/migration-experimental/migration.json`);
  let arcVersion = '0.1.1-rc.4';

  return {
    ...addresses.private.package[arcVersion],
    ...addresses.private.dao[arcVersion],
    NativeToken: addresses.private.dao[arcVersion].DAOToken,
    NativeReputation: addresses.private.dao[arcVersion].Reputation,
    ContributionReward: addresses.private.dao[arcVersion].Schemes[0].address,
    SchemeRegistrar: addresses.private.dao[arcVersion].Schemes[1].address,
    GlobalConstraintRegistrar: addresses.private.dao[arcVersion].Schemes[2].address,
    UpgradeScheme: addresses.private.dao[arcVersion].Schemes[3].address,
    GenericScheme: addresses.private.dao[arcVersion].Schemes[4].address,
    ContributionRewardExt: addresses.private.dao[arcVersion].StandAloneContracts[1].address,
    Competition: addresses.private.dao[arcVersion].StandAloneContracts[2].address,
  };
}

export function getArcVersion() {
  return '0.1.1-rc.4';
}

export function getOrgName() {
  return require(`@daostack/migration-experimental/migration.json`).private.dao['0.1.1-rc.4'].name;
}

export async function getOptions(web3) {
  const block = await web3.eth.getBlock('latest');
  return {
    from: web3.eth.defaultAccount,
    gas: block.gasLimit - 100000,
  };
}

export async function writeProposalIPFS(data: any) {
  const ipfsClient = IPFSClient(ipfs);
  const ipfsResponse = await ipfsClient.add(new Buffer(JSON.stringify(data)));

  return ipfsResponse[0].path;
}

export function padZeros(str: string, max = 36) {
  str = str.toString();
  return str.length < max ? padZeros('0' + str, max) : str;
}

export const createSubscriptionObservable = (
  query: string,
  variables = 0,
  wsurl = node_ws,
) => {
  const client = new SubscriptionClient(wsurl, { reconnect: true }, ws);
  const link = new WebSocketLink(client);
  return execute(link, { query, variables });
};

export async function waitUntilTrue(test: () => Promise<boolean> | boolean) {
  return new Promise((resolve, reject) => {
    (async function waitForIt(): Promise<void> {
      if (await test()) { return resolve(); }
      setTimeout(waitForIt, 30);
    })();
  });
}

export async function waitUntilSynced() {
  const getGraphsSynced = `{
    subgraphs {
      name
      currentVersion {
        deployment {
          latestEthereumBlockNumber
          totalEthereumBlocksCount
          failed
          synced
        }
      }
    }
  }`;
  const graphIsSynced = async () => {
    let result = await sendQuery(
      getGraphsSynced,
      1000,
      'http://127.0.0.1:8000/subgraphs');
    return ((result.subgraphs.length > 0) && result.subgraphs[0].currentVersion.deployment.synced);
    };
  return waitUntilTrue(graphIsSynced);
}

export async function registerAdminAccountScheme(web3, addresses, opts, accounts) {
  const Controller = require('@daostack/migration-experimental/contracts/0.1.1-rc.4/Controller.json');
  const SchemeRegistrar = require('@daostack/migration-experimental/contracts/0.1.1-rc.4/SchemeRegistrar.json');
  const GenesisProtocol = require('@daostack/migration-experimental/contracts/0.1.1-rc.4/GenesisProtocol.json');

  const controller = new web3.eth.Contract(Controller.abi, addresses.Controller, opts);
  const genesisProtocol = new web3.eth.Contract(GenesisProtocol.abi, addresses.GenesisProtocol, opts);
  const schemeRegistrar = new web3.eth.Contract(SchemeRegistrar.abi, addresses.SchemeRegistrar, opts);

  let isRegistered = await controller.methods.isSchemeRegistered(accounts[0].address).call();

  if (!isRegistered) {
    let propose = schemeRegistrar.methods.proposeScheme(
      accounts[0].address,
      '0x0000001f',
      '0x0000000000000000000000000000000000000000000000000000000000000123',
    );
    const proposalId = await propose.call();
    await propose.send();

    await genesisProtocol.methods.vote(proposalId, 1, 0, accounts[0].address).send({ from: accounts[0].address });
    await genesisProtocol.methods.vote(proposalId, 1, 0, accounts[1].address).send({ from: accounts[1].address });
    await genesisProtocol.methods.vote(proposalId, 1, 0, accounts[2].address).send({ from: accounts[2].address });
    await genesisProtocol.methods.vote(proposalId, 1, 0, accounts[3].address).send({ from: accounts[3].address });
  }
}

export async function prepareReputation(web3, addresses, opts, accounts) {
  const Controller = require('@daostack/migration-experimental/contracts/0.1.1-rc.4/Controller.json');
  const Reputation = require('@daostack/migration-experimental/contracts/0.1.1-rc.4/Reputation.json');

  await registerAdminAccountScheme(web3, addresses, opts, accounts);
  const controller = new web3.eth.Contract(Controller.abi, addresses.Controller, opts);
  const reputation = new web3.eth.Contract(Reputation.abi, addresses.NativeReputation, opts);
  for (let i = 0; i < 6; i++) {
    let rep = await reputation.methods.balanceOf(accounts[i].address).call();
    if (Number(web3.utils.fromWei(rep)) < 1000) {
      await controller.methods.mintReputation(
        web3.utils.toWei(`${1000 - Number(web3.utils.fromWei(rep))}`), accounts[i].address,
      ).send();
    } else {
      await controller.methods.burnReputation(
        web3.utils.toWei(`${Number(web3.utils.fromWei(rep)) - 1000}`), accounts[i].address,
      ).send();
    }
  }

}

export const increaseTime = async function(duration, web3) {
  const id = await Date.now();
  web3.providers.HttpProvider.prototype.sendAsync = web3.providers.HttpProvider.prototype.send;

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration],
      id,
    }, (err1) => {
      if (err1) { return reject(err1); }

      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id + 1,
      }, (err2, res) => {
        return err2 ? reject(err2) : resolve(res);
      });
    });
  });
};

export function toFixed(x) {
  if (Math.abs(x) < 1.0) {
    // tslint:disable-next-line: radix
    let e = parseInt(x.toString().split('e-')[1]);
    if (e) {
        x *= Math.pow(10, e - 1);
        x = '0.' + (new Array(e)).join('0') + x.toString().substring(2);
    }
  } else {
    // tslint:disable-next-line: radix
    let e = parseInt(x.toString().split('+')[1]);
    if (e > 20) {
        e -= 20;
        x /= Math.pow(10, e);
        x += (new Array(e + 1)).join('0');
    }
  }
  return x;
}
