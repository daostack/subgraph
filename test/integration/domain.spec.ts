import {
  getContractAddresses,
  getOptions,
  getWeb3,
  sendQuery,
} from './util';

const ContributionReward = require('@daostack/arc/build/contracts/ContributionReward.json');
const GenesisProtocol = require('@daostack/arc/build/contracts/GenesisProtocol.json');
const DAOToken = require('@daostack/arc/build/contracts/DAOToken.json');
const Avatar = require('@daostack/arc/build/contracts/Avatar.json');

describe('Domain Layer', () => {
  let web3;
  let addresses;
  let opts;

  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);
  });

  it('migration dao', async () => {
    const getMigrationDao = `{
      dao(id: "${addresses.Avatar.toLowerCase()}") {
        id
        name
        nativeToken {
          id
          dao {
            id
          }
        }
        nativeReputation {
          id
          dao {
            id
          }
        }
        membersCount
      }
    }`;
    let dao = (await sendQuery(getMigrationDao)).dao;
    expect(dao).toMatchObject({
      id: addresses.Avatar.toLowerCase(),
      name: 'Genesis Test',
      nativeToken: {
        id: addresses.NativeToken.toLowerCase(),
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
      },
      nativeReputation: {
        id: addresses.NativeReputation.toLowerCase(),
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
      },
      membersCount: '6',
    });

    const getMigrationDaoMembers = `{
      dao(id: "${addresses.Avatar.toLowerCase()}") {
        members {
          reputation
          tokens
        }
      }
    }`;
    let members = (await sendQuery(getMigrationDaoMembers)).dao.members;
    expect(members).toContainEqual({
      reputation: '1000000000000000000000',
      tokens: '1000000000000000000000',
    });
  });

  it('Sanity', async () => {
    const accounts = web3.eth.accounts.wallet;

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

    const orgName = 'Genesis Test';
    const tokenName =  'Genesis Test';
    const tokenSymbol = 'GDT';

    let founders =  [
      {
        address: '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1',
        tokens: Number(web3.utils.toWei('1000')),
        reputation: Number(web3.utils.toWei('1000')),
      },
      {
        address: '0xffcf8fdee72ac11b5c542428b35eef5769c409f0',
        tokens: Number(web3.utils.toWei('1000')),
        reputation: Number(web3.utils.toWei('1000')),
      },
      {
        address: '0x22d491bde2303f2f43325b2108d26f1eaba1e32b',
        tokens: Number(web3.utils.toWei('1000')),
        reputation: Number(web3.utils.toWei('1000')),
      },
      {
        address: '0xe11ba2b4d45eaed5996cd0823791e0c93114882d',
        tokens: Number(web3.utils.toWei('1000')),
        reputation: Number(web3.utils.toWei('1000')),
      },
      {
        address: '0xd03ea8624c8c5987235048901fb614fdca89b117',
        tokens: Number(web3.utils.toWei('1000')),
        reputation: Number(web3.utils.toWei('1000')),
      },
      {
        address: '0x95ced938f7991cd0dfcb48f0a06a40fa1af46ebc',
        tokens: Number(web3.utils.toWei('1000')),
        reputation: Number(web3.utils.toWei('1000')),
      },
    ];

    let gpParams =  {
      boostedVotePeriodLimit: '259200',
      daoBountyConst: '75',
      minimumDaoBounty: web3.utils.toWei('100', 'gwei'),
      queuedVotePeriodLimit: '1814400',
      queuedVoteRequiredPercentage: '50',
      preBoostedVotePeriodLimit: '259200',
      proposingRepReward: web3.utils.toWei('5', 'gwei'),
      quietEndingPeriod: '86400',
      thresholdConst: '2000',
      voteOnBehalf: '0x0000000000000000000000000000000000000000',
      activationTime: '0',
      votersReputationLossRatio: '1',
    };

    const avatar = new web3.eth.Contract(Avatar.abi, addresses.Avatar, opts);
    const NativeToken = await avatar.methods.nativeToken().call();
    const NativeReputation = await avatar.methods.nativeReputation().call();
    // END setup

    const getDAO = `{
      dao(id: "${addresses.Avatar.toLowerCase()}") {
        id
        name
        nativeToken {
          id
          dao {
            id
          }
          name
          symbol
          totalSupply
        }
        nativeReputation {
          id
          dao {
            id
          }
          totalSupply
        }
      }
    }`;
    let dao;
    dao = (await sendQuery(getDAO)).dao;

    expect(dao).toMatchObject({
      id: addresses.Avatar.toLowerCase(),
      name: orgName,
      nativeToken: {
        id: NativeToken.toLowerCase(),
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        name: tokenName,
        symbol: tokenSymbol,
        totalSupply: founders
          .map(({ tokens }) => tokens)
          .reduce((x, y) => x + y)
          .toLocaleString('fullwide', {useGrouping: false}),
      },
      nativeReputation: {
        id: NativeReputation.toLowerCase(),
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        totalSupply: founders
          .map(({ reputation }) => reputation)
          .reduce((x, y) => x + y)
          .toLocaleString('fullwide', {useGrouping: false}),
      },
    });

    // check reputation reputationHolders
    const { reputationHolders } = await sendQuery(`{
      reputationHolders (where: {contract: "${NativeReputation.toLowerCase()}"}){
        contract,
        address,
        balance
      }
    }`);

    // there are 6 founders that have reputation in this DAO
    expect(reputationHolders.length).toEqual(6);

    const { tokenHolders } = await sendQuery(`{
      tokenHolders (where: {contract: "${NativeToken.toLowerCase()}"}){
        contract,
        address,
        balance
      }
    }`);

    // there are 6 founders that have tokens in this DAO
    expect(tokenHolders.length).toEqual(6);

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
        addresses.Avatar,
        descHash,
        rep,
        [tokens, eth, external, periodLength, periods],
        addresses.DAOToken,
        beneficiary,
      );
      const proposalId = await prop.call();
      const { blockNumber } = await prop.send();
      const { timestamp } = await web3.eth.getBlock(blockNumber);

      return { proposalId, timestamp };
    }

    const [PASS, FAIL] = [1, 2];
    async function vote({ proposalId, outcome, voter }) {
      const { blockNumber } = await genesisProtocol.methods
        .vote(proposalId, outcome, 0, voter)
        .send({ from: voter });
      const { timestamp } = await web3.eth.getBlock(blockNumber);
      return timestamp;
    }

    async function stake({ proposalId, outcome, amount, staker }) {
      const stakingToken = new web3.eth.Contract(
        DAOToken.abi,
        addresses.DAOToken,
        opts,
      );
      await stakingToken.methods.mint(staker, amount).send();
      await stakingToken.methods.approve(genesisProtocol.options.address, amount).send({ from: staker });
      const { blockNumber } = await genesisProtocol.methods
        .stake(proposalId, outcome, amount)
        .send({ from: staker });
      const { timestamp } = await web3.eth.getBlock(blockNumber);
      return timestamp;
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

    const getProposal = `{
        proposal(id: "${p1}") {
            id
            descriptionHash
            stage
            createdAt
            boostedAt
            quietEndingPeriodBeganAt
            executedAt
            proposer
            votingMachine

            votes {
                createdAt
                proposal {
                    id
                }
                outcome
                reputation
            }
            votesFor
            votesAgainst

            stakes {
              createdAt
              proposal {
                  id
              }
              outcome
              amount
              staker
            }
            stakesFor
            stakesAgainst

            reputationReward
            tokensReward
            externalTokenReward
            externalToken
            ethReward
            beneficiary
            winningOutcome

            queuedVoteRequiredPercentage,
            queuedVotePeriodLimit,
            boostedVotePeriodLimit,
            preBoostedVotePeriodLimit,
            thresholdConst,
            quietEndingPeriod,
            proposingRepReward,
            votersReputationLossRatio,
            minimumDaoBounty,
            daoBountyConst,
            activationTime,
            voteOnBehalf
        }
    }`;
    let proposal;
    proposal = (await sendQuery(getProposal)).proposal;
    expect(proposal).toMatchObject({
      id: p1,
      descriptionHash: descHash,
      stage: 'Open',
      createdAt: p1Creation.toString(),
      boostedAt: null,
      quietEndingPeriodBeganAt: null,
      executedAt: null,
      proposer: web3.eth.defaultAccount.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),

      votes: [],
      votesFor: '0',
      votesAgainst: '0',
      winningOutcome: 'Fail',

      stakes: [],
      stakesFor: '0',
      stakesAgainst: '0',

      reputationReward: '10',
      tokensReward: '10',
      externalTokenReward: '10',
      externalToken: addresses.DAOToken.toLowerCase(),
      ethReward: '10',
      beneficiary: accounts[1].address.toLowerCase(),

      queuedVoteRequiredPercentage: gpParams.queuedVoteRequiredPercentage,
      queuedVotePeriodLimit: gpParams.queuedVotePeriodLimit,
      boostedVotePeriodLimit: gpParams.boostedVotePeriodLimit,
      preBoostedVotePeriodLimit: gpParams.preBoostedVotePeriodLimit,
      thresholdConst: ((Number(gpParams.thresholdConst) / 1000) * 2 ** 40).toString(),
      quietEndingPeriod: gpParams.quietEndingPeriod,
      proposingRepReward: gpParams.proposingRepReward,
      votersReputationLossRatio: gpParams.votersReputationLossRatio,
      minimumDaoBounty: gpParams.minimumDaoBounty,
      daoBountyConst: gpParams.daoBountyConst,
      activationTime: gpParams.activationTime,
      voteOnBehalf: gpParams.voteOnBehalf,
    });

    const v1Timestamp = await vote({
      proposalId: p1,
      outcome: FAIL,
      voter: accounts[0].address,
    });

    proposal = (await sendQuery(getProposal)).proposal;
    expect(proposal).toMatchObject({
      id: p1,
      descriptionHash: descHash,
      stage: 'Open',
      createdAt: p1Creation.toString(),
      boostedAt: null,
      quietEndingPeriodBeganAt: null,
      executedAt: null,
      proposer: web3.eth.defaultAccount.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),

      votes: [
        {
          createdAt: v1Timestamp.toString(),
          outcome: 'Fail',
          proposal: {
            id: p1,
          },
          reputation: '1000000000000000000000',
        },
      ],
      votesFor: '0',
      votesAgainst: '1000000000000000000000',
      winningOutcome: 'Fail',

      stakes: [],
      stakesFor: '0',
      stakesAgainst: '0',

      reputationReward: '10',
      tokensReward: '10',
      externalTokenReward: '10',
      externalToken: addresses.DAOToken.toLowerCase(),
      ethReward: '10',
      beneficiary: accounts[1].address.toLowerCase(),

      queuedVoteRequiredPercentage: gpParams.queuedVoteRequiredPercentage,
      queuedVotePeriodLimit: gpParams.queuedVotePeriodLimit,
      boostedVotePeriodLimit: gpParams.boostedVotePeriodLimit,
      preBoostedVotePeriodLimit: gpParams.preBoostedVotePeriodLimit,
      thresholdConst: ((Number(gpParams.thresholdConst) / 1000) * 2 ** 40).toString(),
      quietEndingPeriod: gpParams.quietEndingPeriod,
      proposingRepReward: gpParams.proposingRepReward,
      votersReputationLossRatio: gpParams.votersReputationLossRatio,
      minimumDaoBounty: gpParams.minimumDaoBounty,
      daoBountyConst: gpParams.daoBountyConst,
      activationTime: gpParams.activationTime,
      voteOnBehalf: gpParams.voteOnBehalf,
    });

    const s1Timestamp = await stake({
      proposalId: p1,
      outcome: FAIL,
      amount: web3.utils.toWei('100'),
      staker: accounts[0].address,
    });

    proposal = (await sendQuery(getProposal)).proposal;
    expect(proposal).toMatchObject({
      id: p1,
      descriptionHash: descHash,
      stage: 'Open',
      createdAt: p1Creation.toString(),
      boostedAt: null,
      quietEndingPeriodBeganAt: null,
      executedAt: null,
      proposer: web3.eth.defaultAccount.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),

      votes: [
        {
          createdAt: v1Timestamp.toString(),
          outcome: 'Fail',
          proposal: {
            id: p1,
          },
          reputation: '1000000000000000000000',
        },
      ],
      votesFor: '0',
      votesAgainst: '1000000000000000000000',
      winningOutcome: 'Fail',

      stakes: [
        {
          amount: '100000000000000000000',
          createdAt: s1Timestamp.toString(),
          outcome: 'Fail',
          proposal: {
            id: p1,
          },
          staker: accounts[0].address.toLowerCase(),
        },
      ],
      stakesFor: '0',
      stakesAgainst: '100000000000000000000',

      reputationReward: '10',
      tokensReward: '10',
      externalTokenReward: '10',
      externalToken: addresses.DAOToken.toLowerCase(),
      ethReward: '10',
      beneficiary: accounts[1].address.toLowerCase(),

      queuedVoteRequiredPercentage: gpParams.queuedVoteRequiredPercentage,
      queuedVotePeriodLimit: gpParams.queuedVotePeriodLimit,
      boostedVotePeriodLimit: gpParams.boostedVotePeriodLimit,
      preBoostedVotePeriodLimit: gpParams.preBoostedVotePeriodLimit,
      thresholdConst: ((Number(gpParams.thresholdConst) / 1000) * 2 ** 40).toString(),
      quietEndingPeriod: gpParams.quietEndingPeriod,
      proposingRepReward: gpParams.proposingRepReward,
      votersReputationLossRatio: gpParams.votersReputationLossRatio,
      minimumDaoBounty: gpParams.minimumDaoBounty,
      daoBountyConst: gpParams.daoBountyConst,
      activationTime: gpParams.activationTime,
      voteOnBehalf: gpParams.voteOnBehalf,
    });

    const s2Timestamp = await stake({
      proposalId: p1,
      outcome: PASS,
      amount: web3.utils.toWei('100'),
      staker: accounts[1].address,
    });

    proposal = (await sendQuery(getProposal)).proposal;
    expect(proposal).toMatchObject({
      id: p1,
      descriptionHash: descHash,
      stage: 'Open',
      createdAt: p1Creation.toString(),
      boostedAt: null,
      quietEndingPeriodBeganAt: null,
      executedAt: null,
      proposer: web3.eth.defaultAccount.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),

      votes: [
        {
          createdAt: v1Timestamp.toString(),
          outcome: 'Fail',
          proposal: {
            id: p1,
          },
          reputation: '1000000000000000000000',
        },
      ],
      votesFor: '0',
      votesAgainst: '1000000000000000000000',
      winningOutcome: 'Fail',

      stakes: [
        {
          amount: '100000000000000000000',
          createdAt: s1Timestamp.toString(),
          outcome: 'Fail',
          proposal: {
            id: p1,
          },
          staker: accounts[0].address.toLowerCase(),
        },
        {
          amount: '100000000000000000000',
          createdAt: s2Timestamp.toString(),
          outcome: 'Pass',
          proposal: {
            id: p1,
          },
          staker: accounts[1].address.toLowerCase(),
        },
      ],
      stakesFor: '100000000000000000000',
      stakesAgainst: '100000000000000000000',

      reputationReward: '10',
      tokensReward: '10',
      externalTokenReward: '10',
      externalToken: addresses.DAOToken.toLowerCase(),
      ethReward: '10',
      beneficiary: accounts[1].address.toLowerCase(),

      queuedVoteRequiredPercentage: gpParams.queuedVoteRequiredPercentage,
      queuedVotePeriodLimit: gpParams.queuedVotePeriodLimit,
      boostedVotePeriodLimit: gpParams.boostedVotePeriodLimit,
      preBoostedVotePeriodLimit: gpParams.preBoostedVotePeriodLimit,
      thresholdConst: ((Number(gpParams.thresholdConst) / 1000) * 2 ** 40).toString(),
      quietEndingPeriod: gpParams.quietEndingPeriod,
      proposingRepReward: gpParams.proposingRepReward,
      votersReputationLossRatio: gpParams.votersReputationLossRatio,
      minimumDaoBounty: gpParams.minimumDaoBounty,
      daoBountyConst: gpParams.daoBountyConst,
      activationTime: gpParams.activationTime,
      voteOnBehalf: gpParams.voteOnBehalf,
    });

    const v2Timestamp = await vote({
      proposalId: p1,
      outcome: PASS,
      voter: accounts[1].address,
    });

    const v3Timestamp = await vote({
      proposalId: p1,
      outcome: PASS,
      voter: accounts[2].address,
    });

    const v4Timestamp = await vote({
      proposalId: p1,
      outcome: PASS,
      voter: accounts[3].address,
    });

    const v5Timestamp = await vote({
      proposalId: p1,
      outcome: PASS,
      voter: accounts[4].address,
    });

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    await sleep(60000);

    proposal = (await sendQuery(getProposal)).proposal;
    expect(proposal).toMatchObject({
      id: p1,
      descriptionHash: descHash,
      stage: 'Resolved',
      createdAt: p1Creation.toString(),
      boostedAt: null,
      quietEndingPeriodBeganAt: null,
      executedAt: v5Timestamp.toString(),
      proposer: web3.eth.defaultAccount.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),

      votesFor: '4000000000000000000000',
      votesAgainst: '1000000000000000000000',
      winningOutcome: 'Pass',

      stakes: [
        {
          amount: '100000000000000000000',
          createdAt: s1Timestamp.toString(),
          outcome: 'Fail',
          proposal: {
            id: p1,
          },
          staker: accounts[0].address.toLowerCase(),
        },
        {
          amount: '100000000000000000000',
          createdAt: s2Timestamp.toString(),
          outcome: 'Pass',
          proposal: {
            id: p1,
          },
          staker: accounts[1].address.toLowerCase(),
        },
      ],
      stakesFor: '100000000000000000000',
      stakesAgainst: '100000000000000000000',

      reputationReward: '10',
      tokensReward: '10',
      externalTokenReward: '10',
      externalToken: addresses.DAOToken.toLowerCase(),
      ethReward: '10',
      beneficiary: accounts[1].address.toLowerCase(),

      queuedVoteRequiredPercentage: gpParams.queuedVoteRequiredPercentage,
      queuedVotePeriodLimit: gpParams.queuedVotePeriodLimit,
      boostedVotePeriodLimit: gpParams.boostedVotePeriodLimit,
      preBoostedVotePeriodLimit: gpParams.preBoostedVotePeriodLimit,
      thresholdConst: ((Number(gpParams.thresholdConst) / 1000) * 2 ** 40).toString(),
      quietEndingPeriod: gpParams.quietEndingPeriod,
      proposingRepReward: gpParams.proposingRepReward,
      votersReputationLossRatio: gpParams.votersReputationLossRatio,
      minimumDaoBounty: gpParams.minimumDaoBounty,
      daoBountyConst: gpParams.daoBountyConst,
      activationTime: gpParams.activationTime,
      voteOnBehalf: gpParams.voteOnBehalf,
    });

    expect(proposal.votes).toContainEqual({
      createdAt: v1Timestamp.toString(),
      outcome: 'Fail',
      proposal: {
        id: p1,
      },
      reputation: '1000000000000000000000',
    });
    expect(proposal.votes).toContainEqual({
      createdAt: v2Timestamp.toString(),
      outcome: 'Pass',
      proposal: {
        id: p1,
      },
      reputation: '1000000000000000000000',
    });
    expect(proposal.votes).toContainEqual({
      createdAt: v3Timestamp.toString(),
      outcome: 'Pass',
      proposal: {
        id: p1,
      },
      reputation: '1000000000000000000000',
    });
    expect(proposal.votes).toContainEqual({
      createdAt: v4Timestamp.toString(),
      outcome: 'Pass',
      proposal: {
        id: p1,
      },
      reputation: '1000000000000000000000',
    });
    expect(proposal.votes).toContainEqual({
      createdAt: v5Timestamp.toString(),
      outcome: 'Pass',
      proposal: {
        id: p1,
      },
      reputation: '1000000000000000000000',
    });
  }, 100000);
});
