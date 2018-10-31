import { query, nullAddress, getWeb3, getContractAddresses, getOptions } from './util';

const GenesisProtocol = require("@daostack/arc/build/contracts/GenesisProtocol.json");

describe("GenesisProtocol", () => {
  let web3, addresses, genesisProtocol;
  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    const opts = await getOptions(web3);
    genesisProtocol = new web3.eth.Contract(GenesisProtocol.abi, addresses.GenesisProtocol, opts)
  });

  it("newProposal", async () => {
    const setParams = await genesisProtocol.methods.setParameters(
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
    const propose = await genesisProtocol.methods.propose(
      2,
      paramsHash,
      web3.eth.defaultAccount,
      nullAddress
    );
    const proposalId = await propose.call();
    await propose.send();

    const data = await query(
      `{ proposal(id: "${proposalId}") { proposalId } }`
    );

    expect(data.proposal).toMatchObject({
      proposalId
    });
  },
    10000
  );
});
