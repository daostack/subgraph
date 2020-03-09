import {
  getArcVersion,
  getOptions,
  getWeb3,
  sendQuery,
  writeProposalIPFS
} from './util';

jest.setTimeout(30000);

const GenesisProtocol = require('@daostack/migration/contracts/' + getArcVersion() + '/GenesisProtocol.json');
const GenericScheme = require('@daostack/migration/contracts/' + getArcVersion() + '/GenericScheme.json');
const devtest = require('../../daos/private/devtest.json');

describe('Generic Signal Scheme', () => {
  let web3;
  let avatar;
  let genesisProtocol;
  let genericScheme;

  /**
   * Deploy a DAO with Generic Scheme (that has address of the SignalScheme)
   *
   */
  beforeAll(async () => {
    web3 = await getWeb3();
    const opts = await getOptions(web3);
    genesisProtocol = await new web3.eth.Contract(GenesisProtocol.abi, "0xa38fcF7C57FC9CdeD86BefD5FF7be5db2CA64359", opts);
    avatar = devtest["Avatar"].toLowerCase();

    genericScheme = new web3.eth.Contract(
      GenericScheme.abi,
      devtest["Schemes"][0].address,
      opts,
    )

  });

  it('Insert Signal Data', async () => {

    let proposalIPFSData = {
      description: 'Setting new header Image',
      title: 'New Header Image',
      url: 'https://w.wallhaven.cc/full/1555/wallhaven-13mk9v.jpg',
      key: 'Header',
      value: 'https://w.wallhaven.cc/full/1555/wallhaven-13mk9v.jpg',
    };

    let matchto = {
      signal:
      {
        data:
          '{"Header":"https://w.wallhaven.cc/full/1555/wallhaven-13mk9v.jpg"}',
        id: avatar,
      },
    };

    await mainTest(web3, avatar, genericScheme, genesisProtocol, proposalIPFSData, matchto);

  }, 100000);

  it('Update Signal Data', async () => {

    let proposalIPFSData = {
      description: 'Update new header Image',
      title: 'New Header Image',
      url: 'https://w.wallhaven.cc/full/1444/wallhaven-13mk9v.jpg',
      key: 'Header',
      value: 'https://w.wallhaven.cc/full/1444/wallhaven-13mk9v.jpg',
    };

    let matchto = {
      signal:
      {
        data:
          '{"Header":"https://w.wallhaven.cc/full/1444/wallhaven-13mk9v.jpg"}',
        id: avatar,
      },
    };

    await mainTest(web3, avatar, genericScheme, genesisProtocol, proposalIPFSData, matchto);

  }, 100000);

  it('Remove Signal Data', async () => {

    let proposalIPFSData = {
      description: 'Remove header Image',
      title: 'Remove Header Image',
      url: '',
      key: 'Header',
      value: '',
    };

    let matchto = {
      signal:
      {
        data:
          '{"Header":""}',
        id: avatar,
      },
    };

    await mainTest(web3, avatar, genericScheme, genesisProtocol, proposalIPFSData, matchto);

  }, 100000);

});

/**
 * Creates a Signal Scheme proposal and then votes on it until it is executed (>50%)
 */
const mainTest = async (web3, avatar, genericScheme, genesisProtocol, proposalIPFSData, matchto) => {
  const accounts = web3.eth.accounts.wallet;

  const descHash = await writeProposalIPFS(proposalIPFSData);
  const prop = genericScheme.methods.proposeCall("0x00", 0, descHash);
  const proposalId = await prop.call();
  console.log(proposalId)
  await prop.send();
  await genesisProtocol.methods.vote(proposalId, 1 /** YES */, 0, accounts[0].address)
    .send({ from: accounts[0].address });
  await genesisProtocol.methods.vote(proposalId, 1 /** YES */, 0, accounts[1].address)
    .send({ from: accounts[1].address });
  await genesisProtocol.methods.vote(proposalId, 1  /** YES */, 0, accounts[2].address)
    .send({ from: accounts[2].address });
  const metaq = `{
      signal(id: "${avatar}"){
        id
        data
      }
    }`;

  const metadata = await sendQuery(metaq, 5000);
  expect(metadata).toMatchObject(matchto);

};
