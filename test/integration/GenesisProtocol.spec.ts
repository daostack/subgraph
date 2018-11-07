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
const Avatar = require("@daostack/arc/build/contracts/Avatar.json");
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

    daoToken = new web3.eth.Contract(DAOToken.abi, addresses.DAOToken, opts);

    genesisProtocolCallbacks = new web3.eth.Contract(
      GenesisProtocolCallbacks.abi,
      reputation.address,
      daoToken.address,
      genesisProtocol.address,
      opts
    );
  });

  it(
    "Sanity",
    async () => {
      const accounts = web3.eth.accounts.wallet;
      let paramsHash = await genesisProtocol.methods
        .getParametersHash(
          [0, 50, 60, 60, 1, 1, 0, 0, 60, 1, 10, 10, 80, 15, 10],
          nullAddress
        )
        .call();

      let txs = [];
      txs.push(await daoToken.methods.mint(accounts[0].address, "100").send());
      txs.push(await daoToken.methods.mint(accounts[1].address, "100").send());
      txs.push(await reputation.methods.mint(accounts[0].address, "60").send());
      txs.push(await reputation.methods.mint(accounts[1].address, "40").send());
      txs.push(
        await genesisProtocol.methods.setParameters(
          [0, 50, 60, 60, 1, 1, 0, 0, 60, 1, 10, 10, 80, 15, 10],
          nullAddress
        )
      );

      let proposalID = await genesisProtocol.methods
        .propose(2, paramsHash, genesisProtocolCallbacks.address, nullAddress)
        .call();

      txs.push(
        await genesisProtocol.methods.propose(
          2,
          paramsHash,
          genesisProtocolCallbacks.address,
          nullAddress
        )
      );

      txs.push(await genesisProtocol.methods.stake(proposalID, 0, 20));
      txs.push(await genesisProtocol.methods.vote(proposalID, 0, accounts[0]));
      txs.push(await genesisProtocol.methods.stake(proposalID, 0, 20));
      txs.push(await genesisProtocol.methods.execute(proposalID));
      txs.push(await genesisProtocol.methods.redeem(proposalID, accounts[0]));

      txs = txs.map(({ transactionHash }) => transactionHash);
    },
    20000
  );
});
