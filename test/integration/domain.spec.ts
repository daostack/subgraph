import {
  getContractAddresses,
  getOptions,
  getWeb3,
  increaseTime,
  sendQuery,
  waitUntilTrue,
  writeProposalIPFS,
} from './util';

const ContributionReward = require('@daostack/arc/build/contracts/ContributionReward.json');
const GenesisProtocol = require('@daostack/arc/build/contracts/GenesisProtocol.json');
const DAOToken = require('@daostack/arc/build/contracts/DAOToken.json');
const Reputation = require('@daostack/arc/build/contracts/Reputation.json');
const Avatar = require('@daostack/arc/build/contracts/Avatar.json');
const REAL_FBITS = 40;
describe('Domain Layer', () => {
  let web3;
  let addresses;
  let opts;
  const orgName = require(`@daostack/migration/migration.json`).private.dao.name;
  const tokenName = orgName + ' Token';
  const tokenSymbol = orgName[0] + orgName.split(' ')[0] + 'T';

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
      name: orgName,
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
    const getMigrationDaoMembersAddress = `{
      dao(id: "${addresses.Avatar.toLowerCase()}") {
        members {
          address
        }
      }
    }`;
    members = (await sendQuery(getMigrationDaoMembersAddress)).dao.members;
    expect(members).toContainEqual({
      address: addresses.Avatar.toLowerCase(),
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

    const stakingToken = new web3.eth.Contract(
      DAOToken.abi,
      addresses.GEN,
      opts,
    );

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
      boostedVotePeriodLimit: '600',
      daoBountyConst: '10',
      minimumDaoBounty: web3.utils.toWei('100', 'gwei'),
      queuedVotePeriodLimit: '1800',
      queuedVoteRequiredPercentage: '50',
      preBoostedVotePeriodLimit: '600',
      proposingRepReward: web3.utils.toWei('5', 'gwei'),
      quietEndingPeriod: '300',
      thresholdConst: '2000',
      voteOnBehalf: '0x0000000000000000000000000000000000000000',
      activationTime: '0',
      votersReputationLossRatio: '1',
    };

    const avatar = new web3.eth.Contract(Avatar.abi, addresses.Avatar, opts);
    const NativeToken = await avatar.methods.nativeToken().call();
    const NativeReputation = await avatar.methods.nativeReputation().call();

    const reputation = await new web3.eth.Contract(
      Reputation.abi,
      NativeReputation,
      opts,
    );

    const totalRep = await reputation.methods.totalSupply().call();
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
        totalSupply: totalRep,
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

    // Save proposal data to IPFS

    let proposalIPFSData = {
      description: 'Just eat them',
      title: 'A modest proposal',
      url: 'http://swift.org/modest',
    };

    let proposalDescription = proposalIPFSData.description;
    let proposalTitle = proposalIPFSData.title;
    let proposalUrl = proposalIPFSData.url;

    const descHash = await writeProposalIPFS(proposalIPFSData);

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
        addresses.GEN,
        beneficiary,
      );
      const proposalId = await prop.call();
      const { blockNumber } = await prop.send();
      const { timestamp } = await web3.eth.getBlock(blockNumber);

      return { proposalId, timestamp };
    }

    const [PASS, FAIL] = [1, 2];
    async function vote({ proposalId, outcome, voter, amount = 0 }) {
      const { blockNumber } = await genesisProtocol.methods
        .vote(proposalId, outcome, amount, voter)
        .send({ from: voter });
      const { timestamp } = await web3.eth.getBlock(blockNumber);
      return timestamp;
    }

    async function stake({ proposalId, outcome, amount, staker }) {

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
            title
            description
            url
            stage
            createdAt
            preBoostedAt
            boostedAt
            quietEndingPeriodBeganAt
            executedAt
            totalRepWhenExecuted
            proposer
            votingMachine
            votes {
                createdAt
                proposal {
                    id
                }
                dao {
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
              dao {
                id
              }
              outcome
              amount
              staker
            }
            stakesFor
            stakesAgainst
            confidenceThreshold

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
            voteOnBehalf,
            expiresInQueueAt,
            contributionReward {
              beneficiary,
              ethReward,
              externalToken,
              externalTokenReward,
              nativeTokenReward,
              reputationReward,
            }
        }
    }`;
    let expectedVotesCount = 0;
    const voteIsIndexed = async () => {
      return (await sendQuery(getProposal)).proposal.votes.length >= expectedVotesCount;
    };

    let expectedStakesCount = 0;
    const stakeIsIndexed = async () => {
      return (await sendQuery(getProposal)).proposal.stakes.length >= expectedStakesCount;
    };

    await waitUntilTrue(voteIsIndexed);
    await waitUntilTrue(stakeIsIndexed);
    let proposal = (await sendQuery(getProposal)).proposal;
    expect(proposal).toMatchObject({
      id: p1,
      descriptionHash: descHash,
      title: proposalTitle,
      description: proposalDescription,
      url: proposalUrl,
      stage: 'Queued',
      createdAt: p1Creation.toString(),
      boostedAt: null,
      quietEndingPeriodBeganAt: null,
      executedAt: null,
      totalRepWhenExecuted: null,
      proposer: web3.eth.defaultAccount.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),

      votes: [],
      votesFor: '0',
      votesAgainst: '0',
      winningOutcome: 'Fail',

      stakes: [],
      stakesFor: '0',
      stakesAgainst: '100000000000',
      confidenceThreshold: '0',

      contributionReward: {
        beneficiary: accounts[1].address.toLowerCase(),
        ethReward: '10',
        externalToken: addresses.GEN.toLowerCase(),
        externalTokenReward: '10',
        nativeTokenReward: '10',
        reputationReward: '10',
      },

      queuedVoteRequiredPercentage: gpParams.queuedVoteRequiredPercentage,
      queuedVotePeriodLimit: gpParams.queuedVotePeriodLimit,
      boostedVotePeriodLimit: gpParams.boostedVotePeriodLimit,
      preBoostedVotePeriodLimit: gpParams.preBoostedVotePeriodLimit,
      thresholdConst: ((Number(gpParams.thresholdConst) / 1000) * 2 ** REAL_FBITS).toString(),
      quietEndingPeriod: gpParams.quietEndingPeriod,
      proposingRepReward: gpParams.proposingRepReward,
      votersReputationLossRatio: gpParams.votersReputationLossRatio,
      minimumDaoBounty: gpParams.minimumDaoBounty,
      daoBountyConst: gpParams.daoBountyConst,
      activationTime: gpParams.activationTime,
      voteOnBehalf: gpParams.voteOnBehalf,
      expiresInQueueAt: (Number(gpParams.queuedVotePeriodLimit) + p1Creation).toString(),
    });

    const address0Rep = await reputation.methods.balanceOf(accounts[0].address).call();
    const address1Rep = await reputation.methods.balanceOf(accounts[1].address).call();
    const address2Rep = await reputation.methods.balanceOf(accounts[2].address).call();
    const address4Rep = await reputation.methods.balanceOf(accounts[4].address).call();

    const v1Timestamp = await vote({
      proposalId: p1,
      outcome: FAIL,
      voter: accounts[0].address,
    });

    expectedVotesCount++;
    await waitUntilTrue(voteIsIndexed);
    proposal = (await sendQuery(getProposal)).proposal;
    expect(proposal).toMatchObject({
      id: p1,
      descriptionHash: descHash,
      stage: 'Queued',
      createdAt: p1Creation.toString(),
      boostedAt: null,
      quietEndingPeriodBeganAt: null,
      executedAt: null,
      totalRepWhenExecuted: null,
      proposer: web3.eth.defaultAccount.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),
      votes: [
        {
          createdAt: v1Timestamp.toString(),
          outcome: 'Fail',
          proposal: {
            id: p1,
          },
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          reputation: address0Rep,
        },
      ],
      votesFor: '0',
      votesAgainst: address0Rep,
      winningOutcome: 'Fail',

      stakes: [],
      stakesFor: '0',
      stakesAgainst: '100000000000',
      confidenceThreshold: '0',

    });

    const s1Timestamp = await stake({
      proposalId: p1,
      outcome: FAIL,
      amount: web3.utils.toWei('100'),
      staker: accounts[0].address,
    });

    expectedStakesCount++;
    await waitUntilTrue(stakeIsIndexed);

    proposal = (await sendQuery(getProposal)).proposal;
    expect(proposal).toMatchObject({
      id: p1,
      descriptionHash: descHash,
      stage: 'Queued',
      createdAt: p1Creation.toString(),
      boostedAt: null,
      quietEndingPeriodBeganAt: null,
      executedAt: null,
      totalRepWhenExecuted: null,
      proposer: web3.eth.defaultAccount.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),
      votes: [
        {
          createdAt: v1Timestamp.toString(),
          outcome: 'Fail',
          proposal: {
            id: p1,
          },
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          reputation: address0Rep,
        },
      ],
      votesFor: '0',
      votesAgainst: address0Rep,
      winningOutcome: 'Fail',

      stakes: [
        {
          amount: '100000000000000000000',
          createdAt: s1Timestamp.toString(),
          outcome: 'Fail',
          proposal: {
            id: p1,
          },
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          staker: accounts[0].address.toLowerCase(),
        },
      ],
      stakesFor: '0',
      stakesAgainst: '100000000100000000000',
      confidenceThreshold: '0',
    });

    const s2Timestamp = await stake({
      proposalId: p1,
      outcome: PASS,
      amount: web3.utils.toWei('100'),
      staker: accounts[1].address,
    });

    expectedStakesCount++;
    await waitUntilTrue(stakeIsIndexed);

    proposal = (await sendQuery(getProposal)).proposal;
    expect(proposal).toMatchObject({
      id: p1,
      descriptionHash: descHash,
      stage: 'Queued',
      createdAt: p1Creation.toString(),
      boostedAt: null,
      quietEndingPeriodBeganAt: null,
      executedAt: null,
      totalRepWhenExecuted: null,
      proposer: web3.eth.defaultAccount.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),
      votes: [
        {
          createdAt: v1Timestamp.toString(),
          outcome: 'Fail',
          proposal: {
            id: p1,
          },
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          reputation: address0Rep,
        },
      ],
      votesFor: '0',
      votesAgainst: address0Rep,
      winningOutcome: 'Fail',
      stakesFor: '100000000000000000000',
      stakesAgainst: '100000000100000000000',
      confidenceThreshold: '0',
    });
    expect(new Set(proposal.stakes)).toEqual(new Set([
      {
        amount: '100000000000000000000',
        createdAt: s2Timestamp.toString(),
        outcome: 'Pass',
        proposal: {
          id: p1,
        },
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        staker: accounts[1].address.toLowerCase(),
      },
      {
        amount: '100000000000000000000',
        createdAt: s1Timestamp.toString(),
        outcome: 'Fail',
        proposal: {
          id: p1,
        },
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        staker: accounts[0].address.toLowerCase(),
      },
    ]));
     /// stake to boost
    const s3Timestamp = await stake({
       proposalId: p1,
       outcome: PASS,
       amount: web3.utils.toWei('300'),
       staker: accounts[1].address,
     });

    proposal = (await sendQuery(getProposal)).proposal;
    expect(proposal.stage).toEqual('PreBoosted');
    expect(proposal.preBoostedAt).toEqual(s3Timestamp.toString());
    expect(proposal.confidenceThreshold).toEqual(Math.pow(2, REAL_FBITS).toString());

    // boost it
    await increaseTime(300000, web3);
    // this will also shift the proposal to boosted phase
    const v2Timestamp = await vote({
      proposalId: p1,
      outcome: PASS,
      voter: accounts[1].address,
    });

    proposal = (await sendQuery(getProposal)).proposal;
    expect(proposal).toMatchObject({
      stage: 'Boosted',
    });

    expectedVotesCount++;
    await waitUntilTrue(voteIsIndexed);

    const v3Timestamp = await vote({
      proposalId: p1,
      outcome: PASS,
      voter: accounts[2].address,
    });

    expectedVotesCount++;
    await waitUntilTrue(voteIsIndexed);

    const v4Timestamp = await vote({
      proposalId: p1,
      outcome: PASS,
      voter: accounts[3].address,
      amount: 1000,
    });

    expectedVotesCount++;
    await waitUntilTrue(voteIsIndexed);

    const v5Timestamp = await vote({
      proposalId: p1,
      outcome: PASS,
      voter: accounts[4].address,
    });

    expectedVotesCount++;
    await waitUntilTrue(voteIsIndexed);

    proposal = (await sendQuery(getProposal)).proposal;
    expect(proposal).toMatchObject({
      id: p1,
      descriptionHash: descHash,
      stage: 'Executed',
      createdAt: p1Creation.toString(),
      boostedAt: v2Timestamp.toString(),
      quietEndingPeriodBeganAt: null,
      executedAt: v5Timestamp.toString(),
      totalRepWhenExecuted: totalRep,
      proposer: web3.eth.defaultAccount.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),
      votesFor: '3000000000000000001000',
      votesAgainst: address0Rep,
      winningOutcome: 'Pass',

      stakesFor: '400000000000000000000',
      stakesAgainst: '100000000100000000000',
      confidenceThreshold: Math.pow(2, REAL_FBITS).toString(),
    });

    expect(new Set(proposal.stakes)).toEqual(new Set([
      {
        amount: '100000000000000000000',
        createdAt: s2Timestamp.toString(),
        outcome: 'Pass',
        proposal: {
          id: p1,
        },
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        staker: accounts[1].address.toLowerCase(),
      },
      {
        amount: '100000000000000000000',
        createdAt: s1Timestamp.toString(),
        outcome: 'Fail',
        proposal: {
          id: p1,
        },
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        staker: accounts[0].address.toLowerCase(),
      },
      {
        amount: '300000000000000000000',
        createdAt: s3Timestamp.toString(),
        outcome: 'Pass',
        proposal: {
          id: p1,
        },
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        staker: accounts[1].address.toLowerCase(),
      },
    ]));

    expect(proposal.votes).toContainEqual({
      createdAt: v1Timestamp.toString(),
      outcome: 'Fail',
      proposal: {
        id: p1,
      },
      dao: {
        id: addresses.Avatar.toLowerCase(),
      },
      reputation: address0Rep,
    });
    expect(proposal.votes).toContainEqual({
      createdAt: v2Timestamp.toString(),
      outcome: 'Pass',
      proposal: {
        id: p1,
      },
      dao: {
        id: addresses.Avatar.toLowerCase(),
      },
      reputation: address1Rep,
    });
    expect(proposal.votes).toContainEqual({
      createdAt: v3Timestamp.toString(),
      outcome: 'Pass',
      proposal: {
        id: p1,
      },
      dao: {
        id: addresses.Avatar.toLowerCase(),
      },
      reputation: address2Rep,
    });
    expect(proposal.votes).toContainEqual({
      createdAt: v4Timestamp.toString(),
      outcome: 'Pass',
      proposal: {
        id: p1,
      },
      dao: {
        id: addresses.Avatar.toLowerCase(),
      },
      reputation: '1000',
    });
    expect(proposal.votes).toContainEqual({
      createdAt: v5Timestamp.toString(),
      outcome: 'Pass',
      proposal: {
        id: p1,
      },
      dao: {
        id: addresses.Avatar.toLowerCase(),
      },
      reputation: address4Rep,
    });

    const getProposalRewards = `{
        proposal(id: "${p1}") {
            gpRewards{
               beneficiary
               reputationForProposer
               tokenAddress
               tokensForStaker
               reputationForVoter
               daoBountyForStaker
               redeemedTokensForStaker
               redeemedReputationForVoter
               redeemedDaoBountyForStaker
               redeemedReputationForProposer
            }
        }
    }`;
    let gpRewards = (await sendQuery(getProposalRewards)).proposal.gpRewards;
    expect(gpRewards).toContainEqual({
    beneficiary: accounts[1].address.toLowerCase(),
    daoBountyForStaker: '100000000000',
    redeemedDaoBountyForStaker: '0',
    redeemedReputationForProposer: '0',
    redeemedReputationForVoter: '0',
    redeemedTokensForStaker: '0',
    reputationForProposer: null,
    reputationForVoter: null,
    tokenAddress: addresses.GEN.toLowerCase(),
    tokensForStaker: '500000000000000000000',
  });
    expect(gpRewards).toContainEqual({
    beneficiary: web3.eth.defaultAccount.toLowerCase(),
    daoBountyForStaker: null,
    redeemedDaoBountyForStaker: '0',
    redeemedReputationForProposer: '0',
    redeemedReputationForVoter: '0',
    redeemedTokensForStaker: '0',
    reputationForProposer: '5000000000',
    reputationForVoter: null,
    tokenAddress: null,
    tokensForStaker: null,
  });
    async function redeem({ proposalId, beneficiary }) {
    const { blockNumber } = await genesisProtocol.methods
      .redeem(proposalId, beneficiary)
      .send();
    const { timestamp } = await web3.eth.getBlock(blockNumber);
    return timestamp;
  }

    async function redeemDaoBounty({ proposalId, beneficiary }) {
    const { blockNumber } = await genesisProtocol.methods
      .redeemDaoBounty(proposalId, beneficiary)
      .send();
    const { timestamp } = await web3.eth.getBlock(blockNumber);
    return timestamp;
  }
  // redeem for proposer
    const r1Timestamp = await redeem({
    proposalId: p1,
    beneficiary: web3.eth.defaultAccount.toLowerCase(),
  });
  // redeem for staker
    const r2Timestamp = await redeem({
    proposalId: p1,
    beneficiary: accounts[1].address.toLowerCase(),
  });

    // mint gen to avatr for the daoBounty
    await stakingToken.methods.mint(addresses.Avatar, '100000000000').send();

    const rd1Timestamp = await redeemDaoBounty({
    proposalId: p1,
    beneficiary: accounts[1].address.toLowerCase(),
  });

    gpRewards = (await sendQuery(getProposalRewards)).proposal.gpRewards;
    expect(gpRewards).toContainEqual({
  beneficiary: accounts[1].address.toLowerCase(),
  daoBountyForStaker: '100000000000',
  redeemedDaoBountyForStaker: rd1Timestamp.toString(),
  redeemedReputationForProposer: '0',
  redeemedReputationForVoter: '0',
  redeemedTokensForStaker: r2Timestamp.toString(),
  reputationForProposer: null,
  reputationForVoter: null,
  tokenAddress: addresses.GEN.toLowerCase(),
  tokensForStaker: '500000000000000000000',
});
    expect(gpRewards).toContainEqual({
  beneficiary: web3.eth.defaultAccount.toLowerCase(),
  daoBountyForStaker: null,
  redeemedDaoBountyForStaker: '0',
  redeemedReputationForProposer: r1Timestamp.toString(),
  redeemedReputationForVoter: '0',
  redeemedTokensForStaker: '0',
  reputationForProposer: '5000000000',
  reputationForVoter: null,
  tokenAddress: null,
  tokensForStaker: null,
});

    const getGPQues = `{
    gpques {
        threshold
    }
    }`;

    let gpQues = (await sendQuery(getGPQues)).gpques;

    expect(gpQues).toContainEqual({
    threshold: Math.pow(2, REAL_FBITS).toString(),
    });

    const { proposalId: p2 } = await propose({
    rep: 10,
    tokens: 10,
    eth: 10,
    external: 10,
    periodLength: 0,
    periods: 1,
    beneficiary: accounts[1].address,
    });

    const getExpiredProposal = `{
    proposal(id: "${p2}") {
        stage
    }}`;

    increaseTime(1814400 + 1 , web3);
    await genesisProtocol.methods.execute(p2).send();

    let stage = (await sendQuery(getExpiredProposal)).proposal.stage;
    expect(stage).toEqual('ExpiredInQueue');

  }, 100000);
});
