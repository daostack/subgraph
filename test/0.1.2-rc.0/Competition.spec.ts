import {
    getArcVersion,
    getContractAddresses,
    getOptions,
    getWeb3,
    increaseTime,
    sendQuery,
    waitUntilTrue,
    writeProposalIPFS,
} from './util';

const ContributionRewardExt = require(
    '@daostack/migration-experimental/contracts/' + getArcVersion() + '/ContributionRewardExt.json',
);
const Competition = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/Competition.json');
const DAOToken = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/DAOToken.json');
const GenesisProtocol = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/GenesisProtocol.json');
const Reputation = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/Reputation.json');

describe('Competition', () => {
    let web3;
    let addresses;
    let opts;
    let contributionReward;
    let competition;
    let genesisProtocol;
    let reputation;
    let competitionAddress;
    beforeAll(async () => {
        web3 = await getWeb3();
        addresses = getContractAddresses();
        opts = await getOptions(web3);
        contributionReward = new web3.eth.Contract(ContributionRewardExt.abi, addresses.ContributionRewardExt, opts);
        competitionAddress = await contributionReward.methods.rewarder().call();
        competition = new web3.eth.Contract(Competition.abi, competitionAddress, opts);
        genesisProtocol = new web3.eth.Contract(GenesisProtocol.abi, addresses.GenesisProtocol, opts);
        reputation = await new web3.eth.Contract(Reputation.abi, addresses.NativeReputation, opts);
    });

    it('Sanity', async () => {
        const accounts = web3.eth.accounts.wallet;

        const externalToken =
          await new web3.eth.Contract(DAOToken.abi, undefined, opts)
          .deploy({ data: DAOToken.bytecode,  arguments: []}).send();
        await externalToken.methods.initialize('Test Token', 'TST', '10000000000', accounts[1].address).send();
        await externalToken.methods.mint(accounts[0].address, '1000000').send({ from: accounts[1].address });
        await externalToken.methods.mint(addresses.Avatar, '1000000').send({ from: accounts[1].address });
        await web3.eth.sendTransaction({
            from: accounts[0].address,
            to: addresses.Avatar,
            value: 10,
            gas: 2000000,
            data: '0x',
        });

        let proposalIPFSData = {
            description: 'Just eat them',
            title: 'A modest proposal',
            url: 'http://swift.org/modest',
            tags: ['test', 'suggestion'],
        };

        let proposalDescription = proposalIPFSData.description;
        let proposalTitle = proposalIPFSData.title;
        let proposalUrl = proposalIPFSData.url;
        let proposalTags = proposalIPFSData.tags;

        const descHash = await writeProposalIPFS(proposalIPFSData);

        const rewards = {
            eth: 10,
            externalToken: 10,
            nativeToken: 10,
            rep: 10,
        };
        let rewardSplit = ['50', '30', '10', '10'];
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
            false,
        );

        const proposalId = await propose.call();
        const { blockNumber: blockNumberPropose } = await propose.send();
        const { timestamp: timestampPropose } = await web3.eth.getBlock(blockNumberPropose);
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
              winningSuggestions {
                suggestionId
              }
              totalSuggestions
              totalVotes
              numberOfWinningSuggestions
              admin
            }
          }`);

        expect(competitionProposal).toEqual({
            id: proposalId,
            proposal: {
                id: proposalId,
            },
            contract: competitionAddress.toLowerCase(),
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
                address: addresses.ContributionRewardExt.toLowerCase(),
            },
            snapshotBlock: null,
            suggestions: [],
            votes: [],
            createdAt: timestampPropose.toString(),
            winningSuggestions: [],
            totalSuggestions: '0',
            totalVotes: '0',
            numberOfWinningSuggestions: '0',
            admin: '0x0000000000000000000000000000000000000000',
        });

        // Pass the ContributionReward proposal to approve the competition
        await genesisProtocol.methods.vote(proposalId, 1, 0, accounts[0].address).send({ from: accounts[0].address });
        await genesisProtocol.methods.vote(proposalId, 1, 0, accounts[1].address).send({ from: accounts[1].address });
        await genesisProtocol.methods.vote(proposalId, 1, 0, accounts[2].address).send({ from: accounts[2].address });
        const { blockNumber: blockNumberApprove } =
            await genesisProtocol.methods.vote(
                proposalId,
                1,
                0,
                accounts[3].address,
            ).send({ from: accounts[3].address });
        const { timestamp: timestampApprove } = await web3.eth.getBlock(blockNumberApprove);
        await contributionReward.methods.redeem(
            proposalId,
            [true, true, true, true],
        ).send({ from: accounts[0].address });

        let proposalExecutedQuery = `{
            proposal(id: "${proposalId}") {
                executedAt
            }
        }`;
        const proposalExecutedIsIndexed = async () => {
            return (await sendQuery(proposalExecutedQuery)).proposal.executedAt !== null;
        };
        await waitUntilTrue(proposalExecutedIsIndexed);

        expect((await sendQuery(proposalExecutedQuery)).proposal).toEqual({
            executedAt: timestampApprove.toString(),
        });

        await increaseTime(20, web3);

        let suggest = competition.methods.suggest(proposalId, descHash, accounts[1].address);

        let suggestionId1 = await suggest.call();

        const { blockNumber: blockNumberSuggest1 } = await suggest.send({ from: accounts[0].address });
        const { timestamp: timestampSuggest1 } = await web3.eth.getBlock(blockNumberSuggest1);

        let competitionSuggestionsQuery = `{
            competitionSuggestions {
                suggestionId
                proposal {
                    id
                }
                descriptionHash
                title
                description
                fulltext
                url
                tags {
                    id
                    numberOfSuggestions
                    competitionSuggestions {
                        suggestionId
                    }
                }
                suggester
                beneficiary
                votes {
                    id
                }
                totalVotes
                createdAt
                positionInWinnerList
            }
          }`;

        let tagsList = [];
        for (let tag of proposalTags) {
            tagsList.unshift({
                    id: tag, numberOfSuggestions: '1',
                    competitionSuggestions: [{ suggestionId: suggestionId1 }],
                });
        }
        expect((await sendQuery(competitionSuggestionsQuery)).competitionSuggestions).toContainEqual({
            suggestionId: suggestionId1.toString(),
            proposal: {
                id: proposalId,
            },
            descriptionHash: descHash,
            title: proposalTitle,
            description: proposalDescription,
            fulltext: proposalTitle.split(' ').concat(proposalDescription.split(' ')),
            url: proposalUrl,
            tags: tagsList,
            suggester: accounts[0].address.toLowerCase(),
            beneficiary: accounts[1].address.toLowerCase(),
            totalVotes: '0',
            votes: [],
            createdAt: timestampSuggest1.toString(),
            positionInWinnerList: null,
        });

        suggest = competition.methods.suggest(proposalId, descHash, '0x0000000000000000000000000000000000000000');

        let suggestionId2 = await suggest.call();
        const { blockNumber: blockNumberSuggest2 } = await suggest.send({ from: accounts[0].address });
        const { timestamp: timestampSuggest2 } = await web3.eth.getBlock(blockNumberSuggest2);

        tagsList = [];
        for (let tag of proposalTags) {
            tagsList.unshift({
                    id: tag, numberOfSuggestions: '2',
                    competitionSuggestions: [{ suggestionId: suggestionId1 }, { suggestionId: suggestionId2 }],
                });
        }
        expect((await sendQuery(competitionSuggestionsQuery)).competitionSuggestions).toContainEqual({
            suggestionId: suggestionId2.toString(),
            proposal: {
                id: proposalId,
            },
            descriptionHash: descHash,
            title: proposalTitle,
            description: proposalDescription,
            fulltext: proposalTitle.split(' ').concat(proposalDescription.split(' ')),
            url: proposalUrl,
            tags: tagsList,
            suggester: accounts[0].address.toLowerCase(),
            beneficiary: accounts[0].address.toLowerCase(),
            totalVotes: '0',
            votes: [],
            createdAt: timestampSuggest2.toString(),
            positionInWinnerList: null,
        });

        let proposalSuggestionsQuery = `{
            competitionProposal(id: "${proposalId}") {
                suggestions(orderBy: suggestionId) {
                    suggestionId
                }
                winningSuggestions {
                    suggestionId
                }
                totalSuggestions
                totalVotes
                numberOfWinningSuggestions
            }
        }`;

        expect((await sendQuery(proposalSuggestionsQuery)).competitionProposal).toEqual({
            suggestions: [
                { suggestionId: suggestionId1.toString() },
                { suggestionId: suggestionId2.toString() },
            ],
            winningSuggestions: [],
            totalSuggestions: '2',
            totalVotes: '0',
            numberOfWinningSuggestions: '0',
        });

        // Get rep balance
        const address0Rep = await reputation.methods.balanceOf(accounts[0].address).call();
        const address1Rep = await reputation.methods.balanceOf(accounts[1].address).call();
        const address2Rep = await reputation.methods.balanceOf(accounts[2].address).call();

        await increaseTime(650, web3);

        // Vote
        const { blockNumber: blockNumberVote1 } =
            await competition.methods.vote(suggestionId1).send({ from: accounts[0].address });
        const { timestamp: timestampVote1 } = await web3.eth.getBlock(blockNumberVote1);

        const { blockNumber: blockNumberVote2 } =
            await competition.methods.vote(suggestionId2).send({ from: accounts[1].address });
        const { timestamp: timestampVote2 } = await web3.eth.getBlock(blockNumberVote2);

        const { blockNumber: blockNumberVote3 } =
            await competition.methods.vote(suggestionId1).send({ from: accounts[2].address });
        const { timestamp: timestampVote3 } = await web3.eth.getBlock(blockNumberVote3);

        let competitionVotesQuery = `{
            competitionVotes {
              proposal {
                id
              }
              suggestion {
                suggestionId
              }
              voter
              createdAt
              reputation
            }
          }`;

        expect((await sendQuery(competitionVotesQuery)).competitionVotes).toContainEqual({
            proposal: {
                id: proposalId,
            },
            // descriptionHash: descHash,
            suggestion: {
                suggestionId: suggestionId1.toString(),
            },
            voter: accounts[0].address.toLowerCase(),
            createdAt: timestampVote1.toString(),
            reputation: address0Rep,
        });

        expect((await sendQuery(competitionVotesQuery)).competitionVotes).toContainEqual({
            proposal: {
                id: proposalId,
            },
            // descriptionHash: descHash,
            suggestion: {
                suggestionId: suggestionId2.toString(),
            },
            voter: accounts[1].address.toLowerCase(),
            createdAt: timestampVote2.toString(),
            reputation: address1Rep,
        });

        expect((await sendQuery(competitionVotesQuery)).competitionVotes).toContainEqual({
            proposal: {
                id: proposalId,
            },
            // descriptionHash: descHash,
            suggestion: {
                suggestionId: suggestionId1.toString(),
            },
            voter: accounts[2].address.toLowerCase(),
            createdAt: timestampVote3.toString(),
            reputation: address2Rep,
        });

        let proposalVotesQuery = `{
            competitionProposal(id: "${proposalId}") {
                votes {
                    suggestion {
                        suggestionId
                    }
                    createdAt
                }
            }
        }`;

        expect((await sendQuery(proposalVotesQuery)).competitionProposal.votes).toContainEqual({
            suggestion: { suggestionId: suggestionId1.toString() }, createdAt: timestampVote1.toString(),
        });

        expect((await sendQuery(proposalVotesQuery)).competitionProposal.votes).toContainEqual({
            suggestion: { suggestionId: suggestionId2.toString() }, createdAt: timestampVote2.toString(),
        });

        expect((await sendQuery(proposalVotesQuery)).competitionProposal.votes).toContainEqual({
            suggestion: { suggestionId: suggestionId1.toString() }, createdAt: timestampVote3.toString(),
        });

        let proposalVotesSnapshotBlockQuery = `{
            competitionProposal(id: "${proposalId}") {
                snapshotBlock
                totalSuggestions
                totalVotes
                numberOfWinningSuggestions
            }
        }`;

        expect((await sendQuery(proposalVotesSnapshotBlockQuery)).competitionProposal).toMatchObject({
            snapshotBlock: blockNumberVote1.toString(),
            totalSuggestions: '2',
            totalVotes: '3',
            numberOfWinningSuggestions: '2',
        });

        let proposalVotesWinningSuggestionsQuery = `{
            competitionProposal(id: "${proposalId}") {
                winningSuggestions {
                    suggestionId
                }
            }
        }`;

        expect((await sendQuery(proposalVotesWinningSuggestionsQuery)).competitionProposal.winningSuggestions)
        .toContainEqual({ suggestionId: suggestionId1.toString() });

        expect((await sendQuery(proposalVotesWinningSuggestionsQuery)).competitionProposal.winningSuggestions)
        .toContainEqual({ suggestionId: suggestionId2.toString() });

        let suggestionVotesVotesQuery = `{
            competitionSuggestions(where: {suggestionId: "${suggestionId1}"}) {
                votes {
                    createdAt
                }
            }
        }`;

        expect((await sendQuery(suggestionVotesVotesQuery)).competitionSuggestions[0].votes).toContainEqual({
             createdAt: timestampVote1.toString(),
        });

        expect((await sendQuery(suggestionVotesVotesQuery)).competitionSuggestions[0].votes).toContainEqual({
            createdAt: timestampVote3.toString(),
       });

        let suggestionVotesQuery = `{
            competitionSuggestions(where: {suggestionId: "${suggestionId1}"}) {
                suggestionId
                positionInWinnerList
            }
        }`;

        expect((await sendQuery(suggestionVotesQuery)).competitionSuggestions).toContainEqual({
            suggestionId: suggestionId1,
            positionInWinnerList: '0',
        });

        let suggestionVotesQuery2 = `{
            competitionSuggestions(where: {suggestionId: "${suggestionId2}"}) {
                suggestionId
                votes {
                    createdAt
                }
                positionInWinnerList
            }
        }`;

        expect((await sendQuery(suggestionVotesQuery2)).competitionSuggestions).toContainEqual({
            suggestionId: suggestionId2,
            votes: [
                { createdAt: timestampVote2.toString() },
            ],
            positionInWinnerList: '1',
        });

        const rewardsLeftQuery = `{
            contributionRewardProposal(id: "${proposalId}") {
                ethRewardLeft
                reputationChangeLeft
                nativeTokenRewardLeft
                externalTokenRewardLeft
            }
        }`;

        expect((await sendQuery(rewardsLeftQuery)).contributionRewardProposal).toEqual({
            ethRewardLeft: rewards.eth.toString(),
            externalTokenRewardLeft: rewards.externalToken.toString(),
            nativeTokenRewardLeft: rewards.nativeToken.toString(),
            reputationChangeLeft: rewards.rep.toString(),
        });

        await increaseTime(600, web3);

        // Redeem
        const { blockNumber: blockNumberRedeem1 } =
            await competition.methods.redeem(suggestionId1).send({ from: accounts[0].address });
        const { timestamp: timestampRedeem1 } = await web3.eth.getBlock(blockNumberRedeem1);

        const { blockNumber: blockNumberRedeem2 } =
            await competition.methods.redeem(suggestionId2).send({ from: accounts[0].address });
        const { timestamp: timestampRedeem2 } = await web3.eth.getBlock(blockNumberRedeem2);

        let suggestionRedeemQuery = `{
            competitionSuggestions(where: {suggestionId: "${suggestionId1}"}) {
                suggestionId
                redeemedAt
                rewardPercentage
                positionInWinnerList
            }
        }`;

        expect((await sendQuery(suggestionRedeemQuery)).competitionSuggestions).toContainEqual({
            suggestionId: suggestionId1,
            redeemedAt: timestampRedeem1.toString(),
            rewardPercentage: '60',
            positionInWinnerList: '0',
        });

        let suggestionRedeemQuery2 = `{
            competitionSuggestions(where: {suggestionId: "${suggestionId2}"}) {
                suggestionId
                redeemedAt
                rewardPercentage
                positionInWinnerList
            }
        }`;

        expect((await sendQuery(suggestionRedeemQuery2)).competitionSuggestions).toContainEqual({
            suggestionId: suggestionId2,
            redeemedAt: timestampRedeem2.toString(),
            rewardPercentage: '40',
            positionInWinnerList: '1',
        });

        expect((await sendQuery(rewardsLeftQuery)).contributionRewardProposal).toEqual({
            ethRewardLeft: '0',
            externalTokenRewardLeft: '0',
            nativeTokenRewardLeft: '0',
            reputationChangeLeft: '0',
        });

    }, 100000);
});
