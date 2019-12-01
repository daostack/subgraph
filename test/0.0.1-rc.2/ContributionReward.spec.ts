import { getContractAddresses, getOptions, getWeb3, increaseTime, prepareReputation, sendQuery, waitUntilTrue } from './util';

const ContributionReward = require('@daostack/migration-experimental/contracts/0.0.1-rc.2/ContributionReward.json');
const DAOToken = require('@daostack/migration-experimental/contracts/0.0.1-rc.2/DAOToken.json');
const Reputation = require('@daostack/migration-experimental/contracts/0.0.1-rc.2/Reputation.json');
const GenesisProtocol = require('@daostack/migration-experimental/contracts/0.0.1-rc.2/GenesisProtocol.json');

describe('ContributionReward', () => {
    let web3;
    let addresses;
    let opts;
    let accounts;
    let contributionReward;
    beforeAll(async () => {
        web3 = await getWeb3();
        addresses = getContractAddresses();
        opts = await getOptions(web3);
        contributionReward = new web3.eth.Contract(ContributionReward.abi, addresses.ContributionReward, opts);
        accounts = web3.eth.accounts.wallet;
        await prepareReputation(web3, addresses, opts, accounts);
    }, 100000);

    it('Sanity', async () => {
        const genesisProtocol = new web3.eth.Contract(
            GenesisProtocol.abi,
            addresses.GenesisProtocol,
            opts,
        );
        const gen = new web3.eth.Contract(
            DAOToken.abi,
            addresses.GEN,
            opts,
        );

        const descHash = '0x0000000000000000000000000000000000000000000000000000000000000123';
        const rewards = {
            eth: 4,
            externalToken: 3,
            nativeToken: 2,
            periodLength: 1000,
            periods: 5,
            rep: 1,
        };

        await gen.methods.mint(addresses.Avatar, web3.utils.toWei(rewards.externalToken.toString())).send();

        const propose = contributionReward.methods.proposeContributionReward(
            descHash,
            rewards.rep,
            [
                rewards.nativeToken,
                rewards.eth,
                rewards.externalToken,
                rewards.periodLength,
                rewards.periods,
            ],
            addresses.GEN,
            accounts[1].address,
        );
        const proposalId = await propose.call();
        const { transactionHash: proposaTxHash } = await propose.send();

        const { contributionRewardNewContributionProposals } = await sendQuery(`{
            contributionRewardNewContributionProposals {
              txHash,
              contract,
              avatar,
              beneficiary,
              descriptionHash,
              externalToken,
              votingMachine,
              proposalId,
              reputationReward,
              nativeTokenReward,
              ethReward,
              externalTokenReward,
              periods,
              periodLength
            }
        }`);

        expect(contributionRewardNewContributionProposals).toContainEqual({
            avatar: addresses.Avatar.toLowerCase(),
            beneficiary: accounts[1].address.toLowerCase(),
            contract: contributionReward.options.address.toLowerCase(),
            descriptionHash: descHash,
            ethReward: rewards.eth.toString(),
            externalToken: addresses.GEN.toLowerCase(),
            externalTokenReward: rewards.externalToken.toString(),
            nativeTokenReward: rewards.nativeToken.toString(),
            periodLength: rewards.periodLength.toString(),
            periods: rewards.periods.toString(),
            proposalId,
            reputationReward: rewards.rep.toString(),
            txHash: proposaTxHash,
            votingMachine: addresses.GenesisProtocol.toLowerCase(),
        });

        let { contributionRewardProposals } = await sendQuery(`{
            contributionRewardProposals {
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
                periodLength,
                executedAt,
                alreadyRedeemedReputationPeriods,
                alreadyRedeemedNativeTokenPeriods,
                alreadyRedeemedEthPeriods,
                alreadyRedeemedExternalTokenPeriods
            }
        }`);

        expect(contributionRewardProposals).toContainEqual({
            alreadyRedeemedEthPeriods: null,
            alreadyRedeemedExternalTokenPeriods: null,
            alreadyRedeemedNativeTokenPeriods: null,
            alreadyRedeemedReputationPeriods: null,
            avatar: addresses.Avatar.toLowerCase(),
            beneficiary: accounts[1].address.toLowerCase(),
            contract: contributionReward.options.address.toLowerCase(),
            descriptionHash: descHash,
            ethReward: rewards.eth.toString(),
            executedAt: null,
            externalToken: addresses.GEN.toLowerCase(),
            externalTokenReward: rewards.externalToken.toString(),
            nativeTokenReward: rewards.nativeToken.toString(),
            periodLength: rewards.periodLength.toString(),
            periods: rewards.periods.toString(),
            proposalId,
            reputationReward: rewards.rep.toString(),
            votingMachine: addresses.GenesisProtocol.toLowerCase(),
        });

        // pass the proposal
        await genesisProtocol.methods.vote(proposalId, 1, 0, accounts[0].address).send({ from: accounts[2].address });
        await genesisProtocol.methods.vote(proposalId, 1, 0, accounts[0].address).send({ from: accounts[3].address });
        await genesisProtocol.methods.vote(proposalId, 1, 0, accounts[0].address).send({ from: accounts[4].address });
        let passTx = await genesisProtocol.methods.vote(
            proposalId, 1, 0, accounts[0].address,
        ).send({ from: accounts[5].address });

        const { transactionHash: executeTxHash, blockNumber } = passTx;
        const block = await web3.eth.getBlock(blockNumber);

        const voteIsIndexed = async () => {
            return (await sendQuery(`
            {
                contributionRewardProposalResolveds(where: {proposalId: "${proposalId}"}) {
                  passed
                }
            }`)).contributionRewardProposalResolveds[0] !== undefined;
        };
        await waitUntilTrue(voteIsIndexed);

        const { contributionRewardProposalResolveds } = await sendQuery(`{
            contributionRewardProposalResolveds {
              txHash
              contract
              avatar
              proposalId
              passed
            }
        }`);

        expect(contributionRewardProposalResolveds).toContainEqual({
            avatar: addresses.Avatar.toLowerCase(),
            contract: contributionReward.options.address.toLowerCase(),
            txHash: executeTxHash,
            passed: true,
            proposalId,
        });

        contributionRewardProposals = (await sendQuery(`{
            contributionRewardProposals {
                executedAt
            }
        }`)).contributionRewardProposals;

        expect(contributionRewardProposals).toContainEqual({
            executedAt: block.timestamp.toString(),
        });

        // wait 2 periods
        await increaseTime(rewards.periodLength * 2, web3);
        const { transactionHash: redeemReputationTxHash } =
            await contributionReward.methods.redeemReputation(proposalId).send();

        const { contributionRewardRedeemReputations } = await sendQuery(`{
            contributionRewardRedeemReputations {
              txHash,
              contract,
              avatar,
              beneficiary,
              proposalId,
              amount
            }
        }`);

        expect(contributionRewardRedeemReputations).toContainEqual({
            txHash: redeemReputationTxHash,
            contract: contributionReward.options.address.toLowerCase(),
            avatar: addresses.Avatar.toLowerCase(),
            beneficiary: accounts[1].address.toLowerCase(),
            proposalId,
            amount: (rewards.rep * 2).toString(),
        });

        contributionRewardProposals = (await sendQuery(`{
            contributionRewardProposals {
                alreadyRedeemedReputationPeriods
            }
        }`)).contributionRewardProposals;

        expect(contributionRewardProposals).toContainEqual({
            alreadyRedeemedReputationPeriods: '2',
        });

        const { transactionHash: redeemNativeTokenTxHash } =
            await contributionReward.methods.redeemNativeToken(proposalId).send();

        const { contributionRewardRedeemNativeTokens } = await sendQuery(`{
            contributionRewardRedeemNativeTokens {
              txHash,
              contract,
              avatar,
              beneficiary,
              proposalId,
              amount
            }
        }`);

        expect(contributionRewardRedeemNativeTokens).toContainEqual({
            txHash: redeemNativeTokenTxHash,
            contract: contributionReward.options.address.toLowerCase(),
            avatar: addresses.Avatar.toLowerCase(),
            beneficiary: accounts[1].address.toLowerCase(),
            proposalId,
            amount: (rewards.nativeToken * 2).toString(),
        });

        contributionRewardProposals = (await sendQuery(`{
            contributionRewardProposals {
                alreadyRedeemedNativeTokenPeriods
            }
        }`)).contributionRewardProposals;

        expect(contributionRewardProposals).toContainEqual({
            alreadyRedeemedNativeTokenPeriods: '2',
        });

        const { transactionHash: redeemExternalTokenTxHash } =
            await contributionReward.methods.redeemExternalToken(proposalId).send();

        const { contributionRewardRedeemExternalTokens } = await sendQuery(`{
            contributionRewardRedeemExternalTokens {
              txHash,
              contract,
              avatar,
              beneficiary,
              proposalId,
              amount
            }
        }`);

        expect(contributionRewardRedeemExternalTokens).toContainEqual({
            txHash: redeemExternalTokenTxHash,
            contract: contributionReward.options.address.toLowerCase(),
            avatar: addresses.Avatar.toLowerCase(),
            beneficiary: accounts[1].address.toLowerCase(),
            proposalId,
            amount: (rewards.externalToken * 2).toString(),
        });

        contributionRewardProposals = (await sendQuery(`{
            contributionRewardProposals {
                alreadyRedeemedExternalTokenPeriods
            }
        }`)).contributionRewardProposals;

        expect(contributionRewardProposals).toContainEqual({
            alreadyRedeemedExternalTokenPeriods: '2',
        });

        await web3.eth.sendTransaction({ from: accounts[0].address,
                                         to: addresses.Avatar.toLowerCase(),
                                         value: web3.utils.toWei('10', 'ether'),
                                         data: '0xABCD', // data field is needed here due to bug in ganache
                                         gas: 50000});

        const { transactionHash: redeemEtherTxHash } =
            await contributionReward.methods.redeemEther(proposalId).send({gas: 1000000});

        const receipt = await web3.eth.getTransactionReceipt(redeemEtherTxHash);

        let amountRedeemed = 0;
        await contributionReward.getPastEvents('RedeemEther', {
              fromBlock: receipt.blockNumber,
              toBlock: 'latest',
          })
          .then(function(events) {
              amountRedeemed = events[0].returnValues._amount;
          });

        const { contributionRewardRedeemEthers } = await sendQuery(`{
            contributionRewardRedeemEthers {
              txHash,
              contract,
              avatar,
              beneficiary,
              proposalId,
              amount
            }
        }`);

        expect(contributionRewardRedeemEthers).toContainEqual({
            txHash: redeemEtherTxHash,
            contract: contributionReward.options.address.toLowerCase(),
            avatar: addresses.Avatar.toLowerCase(),
            beneficiary: accounts[1].address.toLowerCase(),
            proposalId,
            amount: (amountRedeemed).toString(),
        });

        contributionRewardProposals = (await sendQuery(`{
            contributionRewardProposals {
                alreadyRedeemedEthPeriods
            }
        }`)).contributionRewardProposals;

        expect(contributionRewardProposals).toContainEqual({
            alreadyRedeemedEthPeriods: '2',
        });

    }, 100000);
});
