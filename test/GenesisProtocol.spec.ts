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
      addresses.GenesisProtocol[0],
      opts
    );
    reputation = new web3.eth.Contract(
      Reputation.abi,
      addresses.Reputation[0],
      opts
    );

    daoToken = new web3.eth.Contract(DAOToken.abi, addresses.GenesisProtocol[0], opts);

    const GenesisProtocolCallbacksContract = new web3.eth.Contract(
      GenesisProtocolCallbacks.abi,
      undefined,
      opts
    );

    genesisProtocolCallbacks = await GenesisProtocolCallbacksContract.deploy({
      data: GenesisProtocolCallbacks.bytecode,
      arguments: [
        addresses.Reputation[0],
        addresses.GenesisProtocol[0],
        addresses.GenesisProtocol[0]
      ]
    }).send();
  });

  it('Sanity', async () => {
    const accounts = web3.eth.accounts.wallet;
    const params = [
      50, //preBoostedVoteRequiredPercentage
      60, //preBoostedVotePeriodLimit
      5, //boostedVotePeriodLimit
      1,  //thresholdConstA
      1,  //thresholdConstB
      0,  //minimumStakingFee
      0,  //quietEndingPeriod
      60, //proposingRepRewardConstA
      1,  //proposingRepRewardConstB
      10, //stakerFeeRatioForVoters
      10, //votersReputationLossRatio
      80, //votersGainRepRatioFromLostRep
      15, //_daoBountyConst
      10  //_daoBountyLimit
    ];
    const setParams = genesisProtocol.methods.setParameters(params, nullAddress);
    const paramsHash = await setParams.call();
    await setParams.send();

    await daoToken.methods.mint(accounts[0].address, "100").send();
    await daoToken.methods.mint(accounts[1].address, "100").send();
    await daoToken.methods.approve(genesisProtocol.options.address, '100').send();
    await reputation.methods.mint(accounts[0].address, "100").send()
    await reputation.methods.mint(accounts[1].address, "100").send();

    const propose = await genesisProtocolCallbacks.methods.propose(
      2,
      paramsHash,
      genesisProtocolCallbacks.options.address,
      nullAddress,
      nullAddress
    );

    const proposalId = await propose.call();

    let txs = []
    txs.push(await propose.send());
    // boost the proposal
    txs.push(await genesisProtocol.methods.stake(proposalId, 1 /* YES */, 20).send());
    txs.push(await genesisProtocol.methods.stake(proposalId, 1 /* YES */, 20).send({ from: accounts[1].address }));

    // vote for it to pass
    txs.push(await genesisProtocol.methods.vote(proposalId, 1 /* YES */, nullAddress).send());

    // wait for proposal it pass
    await new Promise(res => setTimeout(res, params[2] * 1000))
    txs.push(await genesisProtocol.methods.execute(proposalId).send());
    txs.push(await genesisProtocol.methods.redeem(proposalId, accounts[0].address).send());

    const { genesisProtocolProposals } = await query(`{
      genesisProtocolProposals {
        proposalId
        submittedTime
        proposer
        daoAvatarAddress
        numOfChoices
        state
        decision
        executionTime
        totalReputation
      }
    }`);


    //TODO: This assert fails
    expect(genesisProtocolProposals.length).toEqual(1);
    expect(genesisProtocolProposals).toContainEqual({
      proposalId,
      submittedTime: (await web3.eth.getBlock(txs[0].blockNumber)).timestamp,
      proposer: nullAddress,
      daoAvatarAddress: genesisProtocolCallbacks.options.address.toLowerCase(),
      numOfChoices: '2',
      state: '2',/* Executed */
      decision: '1', /* YES */
      executionTime: (await web3.eth.getBlock(txs[4].blockNumber)).timestamp,
      totalReputation: txs[4].events.ExecuteProposal.returnValues._totalReputation,
    })
  }, 15000)
});
