import { getArcVersion, getContractAddresses, getOptions, getWeb3, sendQuery } from './util';

const ContributionRewardExt = require(
    '@daostack/migration/contracts/' + getArcVersion() + '/ContributionRewardExt.json',
);
const Competition = require('@daostack/migration/contracts/' + getArcVersion() + '/Competition.json');
const DAOToken = require('@daostack/migration/contracts/' + getArcVersion() + '/DAOToken.json');
const GenesisProtocol = require('@daostack/migration/contracts/' + getArcVersion() + '/GenesisProtocol.json');

describe('Competition', () => {
    let web3;
    let addresses;
    let opts;
    let contributionReward;
    let competition;
    let genesisProtocol;
    beforeAll(async () => {
        web3 = await getWeb3();
        addresses = getContractAddresses();
        opts = await getOptions(web3);
        contributionReward = new web3.eth.Contract(ContributionRewardExt.abi, addresses.ContributionRewardExt, opts);
        competition = new web3.eth.Contract(Competition.abi, addresses.Competition, opts);
        genesisProtocol = new web3.eth.Contract(GenesisProtocol.abi, addresses.GenesisProtocol, opts);
    });

    it('Sanity', async () => {
        const accounts = web3.eth.accounts.wallet;

        const externalToken = await new web3.eth.Contract(DAOToken.abi, undefined, opts)
            .deploy({ data: DAOToken.bytecode, arguments: ['Test Token', 'TST', '10000000000'] })
            .send();
        await externalToken.methods.mint(accounts[0].address, '100000').send();
        await externalToken.methods.mint(addresses.Avatar, '100000').send();

        const descHash = '0x0000000000000000000000000000000000000000000000000000000000000123';
        const rewards = {
            eth: 4,
            externalToken: 3,
            nativeToken: 2,
            rep: 1,
        };
        let rewardSplit = ['50', '25', '15', '10'];
        let block = await web3.eth.getBlock('latest');
        let startTime = block.timestamp + 10;
        let votingStartTime = block.timestamp + 600;
        let endTime = block.timestamp + 1200;
        let suggestionsEndTime = block.timestamp + 1200;
        let numberOfVotesPerVoters = 3;
        let competitionParameters = [
            startTime,
            votingStartTime,
            endTime,
            numberOfVotesPerVoters,
            suggestionsEndTime,
        ];
        const propose = competition.methods.proposeCompetition(
            descHash,
            rewards.rep,
            [
                rewards.nativeToken,
                rewards.eth,
                rewards.externalToken,
            ],
            externalToken.options.address,
            rewardSplit,
            competitionParameters,
        );
        const proposalId = await propose.call();
        const { blockNumber } = await propose.send();
        const { timestamp } = await web3.eth.getBlock(blockNumber);
        let { contributionRewardProposal } = await sendQuery(`{
            contributionRewardProposal(id: "${proposalId}") {
                proposalId,
                contract,
                avatar,
                beneficiary,
                descriptionHash,
                externalToken,
                votingMachine,
                reputationReward,
                nativeTokenReward,
                ethReward,
                externalTokenReward,
                periods,
                executedAt,
                alreadyRedeemedReputationPeriods,
                alreadyRedeemedNativeTokenPeriods,
                alreadyRedeemedEthPeriods,
                alreadyRedeemedExternalTokenPeriods
            }
        }`);

        expect(contributionRewardProposal).toEqual({
            alreadyRedeemedEthPeriods: null,
            alreadyRedeemedExternalTokenPeriods: null,
            alreadyRedeemedNativeTokenPeriods: null,
            alreadyRedeemedReputationPeriods: null,
            avatar: addresses.Avatar.toLowerCase(),
            beneficiary: addresses.ContributionRewardExt.toLowerCase(),
            contract: contributionReward.options.address.toLowerCase(),
            descriptionHash: descHash,
            ethReward: rewards.eth.toString(),
            executedAt: null,
            externalToken: externalToken.options.address.toLowerCase(),
            externalTokenReward: rewards.externalToken.toString(),
            nativeTokenReward: rewards.nativeToken.toString(),
            periods: '1',
            proposalId,
            reputationReward: rewards.rep.toString(),
            votingMachine: addresses.GenesisProtocol.toLowerCase(),
        });

        let { competitionProposal } = await sendQuery(`{
            competitionProposal(id: "${proposalId}") {
              id
              proposal {
                id
              }
              contract
              dao {
                id
              }
              numberOfWinners
              rewardSplit
              startTime
              votingStartTime
              suggestionsEndTime
              endTime
              numberOfVotesPerVoters
              contributionReward {
                address
              }
              snapshotBlock
              suggestions {
                id
              }
              votes {
                id
              }
              createdAt
            }
          }`);

        expect(competitionProposal).toEqual({
            id: proposalId,
            proposal: {
                id: proposalId,
            },
            contract: addresses.Competition.toLowerCase(),
            dao: {
                id: addresses.Avatar.toLowerCase(),
            },
            numberOfWinners: rewardSplit.length.toString(),
            rewardSplit,
            startTime: startTime.toString(),
            votingStartTime: votingStartTime.toString(),
            suggestionsEndTime: suggestionsEndTime.toString(),
            endTime: endTime.toString(),
            numberOfVotesPerVoters: numberOfVotesPerVoters.toString(),
            contributionReward: {
                address: addresses.ContributionRewardExt.toLowerCase()
            },
            snapshotBlock: null,
            suggestions: [],
            votes: [],
            createdAt: timestamp.toString(),
        });
    }, 100000);
});
