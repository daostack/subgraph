require("dotenv").config();
process.env = {
  ethereum: "http://127.0.0.1:8545",
  node_http: "http://127.0.0.1:8000/daostack/graphql",
  test_mnemonic:
    "behave pipe turkey animal voyage dial relief menu blush match jeans general",
  ...process.env
};

import * as Web3 from "web3";
import { GraphQLClient } from "graphql-request";
import { migrate } from "../ops";
import * as shell from "shell-exec";
import * as HDWallet from "hdwallet-accounts";

const GenesisProtocol = require("@daostack/arc/build/contracts/GenesisProtocol.json");

describe("Integration test", () => {
  let web3, gql, addresses;
  beforeAll(async () => {
    const { ethereum, node_http, test_mnemonic } = process.env;
    const config = require("../config.json");
    addresses = config.addresses;
    web3 = new Web3(ethereum);
    const hdwallet = HDWallet(10, test_mnemonic);
    Array(10)
      .fill(10)
      .map((_, i) => i)
      .forEach(i => {
        const pk = hdwallet.accounts[i].privateKey;
        const account = web3.eth.accounts.privateKeyToAccount(pk);
        web3.eth.accounts.wallet.add(account);
      });
    web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;
    gql = new GraphQLClient(node_http);
  });

  it(
    "test",
    async () => {
      console.log(addresses);
      const gp = new web3.eth.Contract(
        GenesisProtocol.abi,
        addresses.GenesisProtocol,
        {
          from: web3.eth.defaultAccount,
          gas: (await web3.eth.getBlock("latest")).gasLimit - 100000
        }
      );

      const setParams = await gp.methods.setParameters(
        [
          50, //_preBoostedVoteRequiredPercentage
          1814400, //_preBoostedVotePeriodLimit
          259200, //_boostedVotePeriodLimit
          web3.utils.toWei("7"), //_thresholdConstA
          3, //_thresholdConstB
          web3.utils.toWei("0"), //_minimumStakingFee
          86400, //_quietEndingPeriod
          5, //_proposingRepRewardConstA
          5, //_proposingRepRewardConstB
          50, //_stakerFeeRatioForVoters
          1, //_votersReputationLossRatio
          80, //_votersGainRepRatioFromLostRep
          75, //_daoBountyConst
          web3.utils.toWei("100") //_daoBountyLimit
        ],
        web3.eth.defaultAccount //_voteOnBehalf
      );
      const paramsHash = await setParams.call();
      await setParams.send();
      const propose = await gp.methods.propose(
        2,
        paramsHash,
        web3.eth.defaultAccount,
        "0x0000000000000000000000000000000000000000"
      );
      const proposalId = await propose.call();
      await propose.send();

      await new Promise((res, rej) => setTimeout(res, 9000));

      const response = await gql.request(
        `{
          proposals(where: {id: "${proposalId}"}) {
            id,
            address,
            numOfChoices,
            organization,
            paramsHash,
            proposer
          }
        }`
      );

      // TODO: CHECK RESPONSE
    },
    10000
  );
});
