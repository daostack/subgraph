import {
  getWeb3,
  getContractAddresses,
  getOptions,
  query,
  nullParamsHash,
  padZeros,
  hashLength,
  nullAddress
} from "./util";

const GenesisProtocol = require("@daostack/arc/build/contracts/GenesisProtocol.json");
const GenesisProtocolCallbacks = require("@daostack/arc/build/contracts/GenesisProtocolCallbacksMock.json");
const DAOToken = require("@daostack/arc/build/contracts/DAOToken.json");
const Reputation = require("@daostack/arc/build/contracts/Reputation.json");

describe("GenesisProtocol", () => {
  let web3,
    addresses,
    genesisProtocol,
    daoToken,
    opts,
    reputation,
    genesisProtocolCallbacks;
  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);

    genesisProtocol = new web3.eth.Contract(
      GenesisProtocol.abi,
      addresses.GenesisProtocol,
      opts
    );
    reputation = new web3.eth.Contract(
      Reputation.abi,
      addresses.Reputation,
      opts
    );

    daoToken = new web3.eth.Contract(DAOToken.abi, addresses.GPToken, opts);

    const GenesisProtocolCallbacksContract = new web3.eth.Contract(
      GenesisProtocolCallbacks.abi,
      undefined,
      opts
    );

    genesisProtocolCallbacks = await GenesisProtocolCallbacksContract.deploy({
      data: GenesisProtocolCallbacks.bytecode,
      arguments: [
        addresses.Reputation,
        addresses.GPToken,
        addresses.GenesisProtocol
      ]
    }).send();
  });

  it(
    "Sanity",
    async () => {
      const accounts = web3.eth.accounts.wallet;
      let paramsHash = await genesisProtocol.methods
        .getParametersHash(
          [50, 60, 60, 1, 1, 0, 0, 60, 1, 10, 10, 80, 15, 10],
          nullAddress
        )
        .call();

      let txs = [];
      txs.push(await daoToken.methods.mint(accounts[0].address, "100").send());
      txs.push(await daoToken.methods.mint(accounts[1].address, "100").send());
      txs.push(await reputation.methods.mint(accounts[0].address, "60").send());
      txs.push(await reputation.methods.mint(accounts[1].address, "40").send());
      txs.push(
        await genesisProtocolCallbacks.methods
          .setParameters(
            [50, 60, 60, 1, 1, 0, 0, 60, 1, 10, 10, 80, 15, 10],
            nullAddress
          )
          .send()
      );

      let proposalID = await genesisProtocolCallbacks.methods
        .propose(
          2,
          paramsHash,
          genesisProtocolCallbacks.options.address,
          nullAddress,
          nullAddress
        )
        .call();

      txs.push(
        await genesisProtocolCallbacks.methods
          .propose(
            2,
            paramsHash,
            genesisProtocolCallbacks.options.address,
            nullAddress,
            nullAddress
          )
          .send()
      );

      txs.push(await genesisProtocol.methods.stake(proposalID, 1, 20).send());
      txs.push(
        await genesisProtocol.methods.vote(proposalID, 2, nullAddress).send()
      );
      txs.push(await genesisProtocol.methods.stake(proposalID, 1, 20).send());
      txs.push(await genesisProtocol.methods.execute(proposalID).send());
      txs.push(
        await genesisProtocol.methods
          .redeem(proposalID, accounts[0].address)
          .send()
      );

      txs = txs.map(({ transactionHash }) => transactionHash);

      const { proposals } = await query(`{
        proposals {
          proposalId,
          submittedTime,
          proposer
        }
      }`);

      expect(proposals.length).toEqual(1);
      expect(proposals).toContainEqual({
        proposalId: proposalID,
        submittedTime: (await web3.eth.getBlock(txs[5].blockNumber)).timestamp,
        proposer: nullAddress
      });
    },
    20000
  );
});
