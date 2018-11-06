import { getWeb3, getContractAddresses, getOptions, query } from "./util";

const ContributionReward = require('@daostack/arc/build/contracts/ContributionReward.json');
const DAOToken = require('@daostack/arc/build/contracts/DAOToken.json');
const Reputation = require('@daostack/arc/build/contracts/Reputation.json');
const Avatar = require('@daostack/arc/build/contracts/Avatar.json');
const UController = require('@daostack/arc/build/contracts/UController.json');
const AbsoluteVote = require('@daostack/arc/build/contracts/AbsoluteVote.json')

describe('Reputation', () => {
    let web3, addresses, opts, contributionReward;
    beforeAll(async () => {
        web3 = await getWeb3();
        addresses = getContractAddresses();
        opts = await getOptions(web3);
        contributionReward = new web3.eth.Contract(ContributionReward.abi, addresses.Reputation, opts);
    });

    it('Sanity', async () => {
        const accounts = web3.eth.accounts.wallet;

        // START long setup ...
        const daoToken = await new web3.eth.Contract(DAOToken.abi, undefined, opts)
            .deploy({ data: DAOToken.bytecode, arguments: ['Test Token', 'TST', '10000000000'] })
            .send();

        await daoToken.methods.mint(accounts[0].address, '100000'); // to pay propose fee
        const reputation = await new web3.eth.Contract(Reputation.abi, undefined, opts)
            .deploy({ data: Reputation.bytecode, arguments: [] })
            .send();

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
        console.log('before', absVoteParamsHash, absVote.options.address)

        const paramsHash = await contributionReward.methods.setParameters(0, absVoteParamsHash, absVote.options.address).send();
        console.log('after', paramsHash)
        await controller.methods.newOrganization(avatar.options.address).send();

        await controller.methods.registerScheme(
            contributionReward.options.address,
            paramsHash,
            '0x0000001F', // full permissions,
            avatar.options.address
        ).send();
        console.log('hello')
        // END setup

        let txs = [];
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
        txs.push(await propose.send());
        txs = txs.map(({ transactionHash }) => transactionHash);

    }, 100000)
})
