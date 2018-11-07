import { getWeb3, getContractAddresses, getOptions, query } from "./util";

const ContributionReward = require('@daostack/arc/build/contracts/ContributionReward.json');
const DAOToken = require('@daostack/arc/build/contracts/DAOToken.json');
const Reputation = require('@daostack/arc/build/contracts/Reputation.json');
const Avatar = require('@daostack/arc/build/contracts/Avatar.json');
const UController = require('@daostack/arc/build/contracts/UController.json');
const AbsoluteVote = require('@daostack/arc/build/contracts/AbsoluteVote.json')

describe('ContributionReward', () => {
    let web3, addresses, opts, contributionReward;
    beforeAll(async () => {
        web3 = await getWeb3();
        addresses = getContractAddresses();
        opts = await getOptions(web3);
        contributionReward = new web3.eth.Contract(ContributionReward.abi, addresses.ContributionReward, opts);
    });

    it('Sanity', async () => {
        const accounts = web3.eth.accounts.wallet;

        // START long setup ...
        const daoToken = await new web3.eth.Contract(DAOToken.abi, undefined, opts)
            .deploy({ data: DAOToken.bytecode, arguments: ['Test Token', 'TST', '10000000000'] })
            .send();

        const reputation = await new web3.eth.Contract(Reputation.abi, undefined, opts)
            .deploy({ data: Reputation.bytecode, arguments: [] })
            .send();
        await reputation.methods.mint(accounts[1].address, 100000).send(); // to be able to pass a vote

        const avatar = await new web3.eth.Contract(Avatar.abi, undefined, opts)
            .deploy({ data: Avatar.bytecode, arguments: ['Test', daoToken.options.address, reputation.options.address] })
            .send();

        const controller = await new web3.eth.Contract(UController.abi, undefined, opts)
            .deploy({ data: UController.bytecode, arguments: [] })
            .send();

        const absVote = await new web3.eth.Contract(AbsoluteVote.abi, undefined, opts)
            .deploy({ data: AbsoluteVote.bytecode, arguments: [] })
            .send();

        const setParams = absVote.methods.setParameters(20, true);
        const absVoteParamsHash = await setParams.call()
        await setParams.send()
        const crSetParams = contributionReward.methods.setParameters(0, absVoteParamsHash, absVote.options.address);
        const paramsHash = await crSetParams.call();
        await crSetParams.send()

        await avatar.methods.transferOwnership(controller.options.address).send();
        await controller.methods.newOrganization(avatar.options.address).send();
        await controller.methods.registerScheme(
            contributionReward.options.address,
            paramsHash,
            '0x0000001F', // full permissions,
            avatar.options.address
        ).send();
        // END setup

        const descHash = '0x0000000000000000000000000000000000000000000000000000000000000123';
        const rewards = {
            rep: 1,
            nativeToken: 2,
            externalToken: 3,
            eth: 4,
            periods: 5,
            periodLength: 6
        }
        const propose = contributionReward.methods.proposeContributionReward(
            avatar.options.address,
            descHash,
            rewards.rep,
            [
                rewards.nativeToken,
                rewards.eth,
                rewards.externalToken,
                rewards.periodLength,
                rewards.periods
            ],
            daoToken.options.address,
            accounts[1].address
        );
        const proposalId = await propose.call();
        const { transactionHash: proposaTxHash } = await propose.send();

        const { contributionRewardNewContributionProposals } = await query(`{
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

        expect(contributionRewardNewContributionProposals.length).toEqual(1);
        expect(contributionRewardNewContributionProposals).toContainEqual({
            txHash: proposaTxHash,
            proposalId,
            contract: contributionReward.options.address.toLowerCase(),
            avatar: avatar.options.address.toLowerCase(),
            beneficiary: accounts[1].address.toLowerCase(),
            descriptionHash: descHash,
            externalToken: daoToken.options.address.toLowerCase(),
            votingMachine: absVote.options.address.toLowerCase(),
            reputationReward: rewards.rep.toString(),
            nativeTokenReward: rewards.nativeToken.toString(),
            ethReward: rewards.eth.toString(),
            externalTokenReward: rewards.externalToken.toString(),
            periods: rewards.periods.toString(),
            periodLength: rewards.periodLength.toString()
        })

        let { contributionRewardProposals } = await query(`{
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

        expect(contributionRewardProposals.length).toEqual(1);
        expect(contributionRewardProposals).toContainEqual({
            proposalId,
            contract: contributionReward.options.address.toLowerCase(),
            avatar: avatar.options.address.toLowerCase(),
            beneficiary: accounts[1].address.toLowerCase(),
            descriptionHash: descHash,
            externalToken: daoToken.options.address.toLowerCase(),
            votingMachine: absVote.options.address.toLowerCase(),
            reputationReward: rewards.rep.toString(),
            nativeTokenReward: rewards.nativeToken.toString(),
            ethReward: rewards.eth.toString(),
            externalTokenReward: rewards.externalToken.toString(),
            periods: rewards.periods.toString(),
            periodLength: rewards.periodLength.toString(),
            executedAt: null,
            alreadyRedeemedReputationPeriods: null,
            alreadyRedeemedNativeTokenPeriods: null,
            alreadyRedeemedEthPeriods: null,
            alreadyRedeemedExternalTokenPeriods: null
        });

        // pass the proposal
        const { transactionHash: executeTxHash, blockNumber, ...rest } = await absVote.methods.vote(proposalId, 1, accounts[0].address).send({ from: accounts[1].address });
        const block = await web3.eth.getBlock(blockNumber);

        const { contributionRewardProposalResolveds } = await query(`{
            contributionRewardProposalResolveds {
              txHash
              contract
              avatar
              proposalId
              passed
            }
        }`);

        expect(contributionRewardProposalResolveds.length).toEqual(1);
        expect(contributionRewardProposalResolveds).toContainEqual({
            txHash: executeTxHash,
            contract: contributionReward.options.address.toLowerCase(),
            avatar: avatar.options.address.toLowerCase(),
            passed: true,
            proposalId
        });

        contributionRewardProposals = (await query(`{
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
        }`)).contributionRewardProposals;

        expect(contributionRewardProposals.length).toEqual(1);
        expect(contributionRewardProposals).toContainEqual({
            proposalId,
            contract: contributionReward.options.address.toLowerCase(),
            avatar: avatar.options.address.toLowerCase(),
            beneficiary: accounts[1].address.toLowerCase(),
            descriptionHash: descHash,
            externalToken: daoToken.options.address.toLowerCase(),
            votingMachine: absVote.options.address.toLowerCase(),
            reputationReward: rewards.rep.toString(),
            nativeTokenReward: rewards.nativeToken.toString(),
            ethReward: rewards.eth.toString(),
            externalTokenReward: rewards.externalToken.toString(),
            periods: rewards.periods.toString(),
            periodLength: rewards.periodLength.toString(),
            executedAt: block.timestamp.toString(),
            alreadyRedeemedReputationPeriods: null,
            alreadyRedeemedNativeTokenPeriods: null,
            alreadyRedeemedEthPeriods: null,
            alreadyRedeemedExternalTokenPeriods: null
        });

        // wait 2 periods
        await new Promise(res => setTimeout(res, rewards.periodLength * 2 * 1000))
        expect(await contributionReward.methods.getPeriodsToPay(proposalId, avatar.options.address, 0).call()).toEqual('2');
        await contributionReward.methods.redeemReputation(proposalId, avatar.options.address).send();

    }, 100000)
})
