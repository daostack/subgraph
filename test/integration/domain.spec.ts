import {
  getContractAddresses,
  getOptions,
  getWeb3,
  padZeros,
  sendQuery,
} from './util';

const DaoCreator = require('@daostack/arc/build/contracts/DaoCreator.json');
const ControllerCreator = require('@daostack/arc/build/contracts/ControllerCreator.json');
const ContributionReward = require('@daostack/arc/build/contracts/ContributionReward.json');
const GenesisProtocol = require('@daostack/arc/build/contracts/GenesisProtocol.json');
const DAOToken = require('@daostack/arc/build/contracts/DAOToken.json');
const Avatar = require('@daostack/arc/build/contracts/Avatar.json');

describe('Domain Layer', () => {
  let web3;
  let addresses;
  let opts;
  let daotoken;
  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);
  });

  it('Sanity', async () => {
    const accounts = web3.eth.accounts.wallet;

    // START setup
    const externalToken = await new web3.eth.Contract(
      DAOToken.abi,
      undefined,
      opts,
    )
      .deploy({
        data: DAOToken.bytecode,
        arguments: ['External', 'EXT', 0],
      })
      .send();

    const controllerCreator = await new web3.eth.Contract(
      ControllerCreator.abi,
      undefined,
      opts,
    )
      .deploy({
        data: ControllerCreator.bytecode,
        arguments: [],
      })
      .send();

    const daoCreator = await new web3.eth.Contract(
      DaoCreator.abi,
      undefined,
      opts,
    )
      .deploy({
        data: DaoCreator.bytecode,
        arguments: [controllerCreator.options.address],
      })
      .send();

    const { orgName, tokenName, tokenSymbol, founders, cap } = {
      orgName: 'TSST DAO',
      tokenName: 'TSST Token',
      tokenSymbol: 'TST',
      founders: [
        {
          address: accounts[0].address,
          tokens: 100,
          reputation: 100,
        },
        {
          address: accounts[1].address,
          tokens: 100,
          reputation: 300,
        },
        {
          address: accounts[2].address,
          tokens: 100,
          reputation: 100,
        },
      ],
      cap: 0,
    };
    const forge = daoCreator.methods.forgeOrg(
      orgName,
      tokenName,
      tokenSymbol,
      founders.map(({ address }) => address),
      founders.map(({ tokens }) => tokens),
      founders.map(({ reputation }) => reputation),
      addresses.UController,
      cap,
    );
    const avatarAddress = await forge.call();
    await forge.send();

    const contributionReward = new web3.eth.Contract(
      ContributionReward.abi,
      addresses.ContributionReward,
      opts,
    );
    const genesisProtocol = new web3.eth.Contract(
      GenesisProtocol.abi,
      addresses.GenesisProtocol,
      opts,
    );

    const gpParams = {
      boostedVotePeriodLimit: 259200,
      daoBountyConst: 75,
      daoBountyLimitGWei: 100,
      minimumStakingFeeGWei: 0,
      preBoostedVotePeriodLimit: 1814400,
      preBoostedVoteRequiredPercentage: 50,
      proposingRepRewardConstA: 5,
      proposingRepRewardConstB: 5,
      quietEndingPeriod: 86400,
      stakerFeeRatioForVoters: 50,
      thresholdConstAGWei: 7,
      thresholdConstB: 3,
      voteOnBehalf: '0x0000000000000000000000000000000000000000',
      votersGainRepRatioFromLostRep: 80,
      votersReputationLossRatio: 1,
    };
    const gpSetParams = genesisProtocol.methods.setParameters(
      [
        gpParams.preBoostedVoteRequiredPercentage,
        gpParams.preBoostedVotePeriodLimit,
        gpParams.boostedVotePeriodLimit,
        web3.utils.toWei(gpParams.thresholdConstAGWei.toString(), 'gwei'),
        gpParams.thresholdConstB,
        web3.utils.toWei(gpParams.minimumStakingFeeGWei.toString(), 'gwei'),
        gpParams.quietEndingPeriod,
        gpParams.proposingRepRewardConstA,
        gpParams.proposingRepRewardConstB,
        gpParams.stakerFeeRatioForVoters,
        gpParams.votersReputationLossRatio,
        gpParams.votersGainRepRatioFromLostRep,
        gpParams.daoBountyConst,
        web3.utils.toWei(gpParams.daoBountyLimitGWei.toString(), 'gwei'),
      ],
      gpParams.voteOnBehalf,
    );
    const gpParamsHash = await gpSetParams.call();
    await gpSetParams.send();

    const crParams = {
      orgNativeTokenFeeGWei: 0,
    };
    const crSetParams = contributionReward.methods.setParameters(
      web3.utils.toWei(crParams.orgNativeTokenFeeGWei.toString(), 'gwei'),
      gpParamsHash,
      addresses.GenesisProtocol,
    );
    const crParamsHash = await crSetParams.call();
    await crSetParams.send();

    const schemes = [
      {
        address: addresses.ContributionReward,
        params: crParamsHash,
        permissions: '0x00000000', /* no special params */
      },
    ];
    await daoCreator.methods
      .setSchemes(
        avatarAddress,
        schemes.map(({ address }) => address),
        schemes.map(({ params }) => params),
        schemes.map(({ permissions }) => permissions),
      )
      .send();

    const avatar = new web3.eth.Contract(Avatar.abi, avatarAddress, opts);
    const NativeToken = await avatar.methods.nativeToken().call();
    const NativeReputation = await avatar.methods.nativeReputation().call();
    // END setup

    const descHash =
      '0x000000000000000000000000000000000000000000000000000000000000abcd';
    async function propose({
      rep,
      tokens,
      eth,
      external,
      periodLength,
      periods,
      beneficiary,
    }) {
      const prop = contributionReward.methods.proposeContributionReward(
        avatarAddress,
        descHash,
        rep,
        [tokens, eth, external, periodLength, periods],
        externalToken.options.address,
        beneficiary,
      );
      const proposalId = await prop.call();
      const { blockNumber } = await prop.send();
      const { timestamp } = await web3.eth.getBlock(blockNumber);

      return { proposalId, timestamp };
    }

    const [PASS, FAIL] = [1, 2];
    async function vote({ proposalId, outcome, voter }) {
      await genesisProtocol.methods
        .vote(proposalId, outcome, voter)
        .send({ from: voter });
    }

    const { proposalId: p1, timestamp: p1Creation } = await propose({
      rep: 10,
      tokens: 10,
      eth: 10,
      external: 10,
      periodLength: 0,
      periods: 1,
      beneficiary: accounts[1].address,
    });

    const { proposal } = await sendQuery(`{
        proposal(id: "${p1}") {
            id
            ipfsHash
            stage
            createdAt
            boostedAt
            overtimedAt
            executedAt

            votes
            votesFor
            votesAgainst

            stakes
            stakesFor
            stakesAgainst

            reputationReward
            tokensReward
            externalTokenReward
            externalToken
            ethReward
            beneficiary
        }
    }`);
    expect(proposal).toMatchObject({
      id: p1,
      ipfsHash: descHash,
      stage: 'Open',
      createdAt: p1Creation.toString(),
      boostedAt: null,
      overtimedAt: null,
      executedAt: null,

      votes: [],
      votesFor: '0',
      votesAgainst: '0',

      stakes: [],
      stakesFor: '0',
      stakesAgainst: '0',

      reputationReward: '10',
      tokensReward: '10',
      externalTokenReward: '10',
      externalToken: externalToken.options.address.toLowerCase(),
      ethReward: '10',
      beneficiary: accounts[1].address.toLowerCase(),
    });

    await vote({
      proposalId: p1,
      outcome: FAIL,
      voter: accounts[2].address,
    });
    await vote({
      proposalId: p1,
      outcome: PASS,
      voter: accounts[1].address,
    });
  }, 100000);
});
