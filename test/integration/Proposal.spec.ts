import { getContractAddresses, getOptions, getWeb3, nullAddress , sendQuery} from './util';

const GenesisProtocol = require('@daostack/arc/build/contracts/GenesisProtocol.json');
const Avatar = require('@daostack/arc/build/contracts/Avatar.json');
const ContributionReward = require('@daostack/arc/build/contracts/ContributionReward.json');
const DAOToken = require('@daostack/arc/build/contracts/DAOToken.json');
const Reputation = require('@daostack/arc/build/contracts/Reputation.json');
const UController = require('@daostack/arc/build/contracts/UController.json');
const GenesisProtocolCallbacks = require('@daostack/arc/build/contracts/GenesisProtocolCallbacksMock.json');

describe('Proposal', () => {
    let web3;
    let addresses;
    let opts;
    let contributionReward;
    let genesisProtocol;
    let genesisProtocolCallbacks;
    let daoToken;
    beforeAll(async () => {
        web3 = await getWeb3();
        addresses = getContractAddresses();
        opts = await getOptions(web3);
        contributionReward = new web3.eth.Contract(ContributionReward.abi, addresses.ContributionReward, opts);
    });

    it('Sanity', async () => {
        const accounts = web3.eth.accounts.wallet;

        // START long setup ...
        const externalToken = await new web3.eth.Contract(DAOToken.abi, undefined, opts)
            .deploy({ data: DAOToken.bytecode, arguments: ['Test Token', 'TST', '10000000000'] })
            .send();
        await externalToken.methods.mint(accounts[0].address, '100000').send();

        const nativeToken = await new web3.eth.Contract(DAOToken.abi, undefined, opts)
            .deploy({ data: DAOToken.bytecode, arguments: ['Test Token', 'TST', '10000000000'] })
            .send();

        const reputation = await new web3.eth.Contract(Reputation.abi, undefined, opts)
            .deploy({ data: Reputation.bytecode, arguments: [] })
            .send();
        await reputation.methods.mint(accounts[1].address, 100000).send(); // to be able to pass a vote

        const avatar = await new web3.eth.Contract(Avatar.abi, undefined, opts)
            .deploy({ arguments: ['Test', nativeToken.options.address, reputation.options.address],
                      data: Avatar.bytecode,
                    })
            .send();
        await externalToken.methods.transfer(avatar.options.address, '100000').send();

        const controller = await new web3.eth.Contract(UController.abi, undefined, opts)
            .deploy({ data: UController.bytecode, arguments: [] })
            .send();

        genesisProtocol = new web3.eth.Contract(
                             GenesisProtocol.abi,
                             addresses.GenesisProtocol,
                             opts,
                             );
        daoToken = new web3.eth.Contract(DAOToken.abi, addresses.GPToken, opts);

        genesisProtocolCallbacks = await new web3.eth.Contract(GenesisProtocolCallbacks.abi, undefined, opts)
           .deploy({ data: GenesisProtocolCallbacks.bytecode,
                     arguments: [reputation.options.address,
                                 daoToken.options.address,
                                 genesisProtocol.options.address] })
           .send();
        const params = [
         50, // preBoostedVoteRequiredPercentage
         60, // preBoostedVotePeriodLimit
         5, // boostedVotePeriodLimit
         1,  // thresholdConstA
         1,  // thresholdConstB
         0,  // minimumStakingFee
         0,  // quietEndingPeriod
         60, // proposingRepRewardConstA
         1,  // proposingRepRewardConstB
         10, // stakerFeeRatioForVoters
         10, // votersReputationLossRatio
         80, // votersGainRepRatioFromLostRep
         15, // _daoBountyConst
         10,  // _daoBountyLimit
       ];
        const setParams = genesisProtocol.methods.setParameters(params, nullAddress);
        const gpParamsHash = await setParams.call();
        await setParams.send();

        const crSetParams = contributionReward.methods.setParameters(0, gpParamsHash, genesisProtocol.options.address);
        const paramsHash = await crSetParams.call();
        await crSetParams.send();
        await reputation.methods.transferOwnership(controller.options.address).send();
        await nativeToken.methods.transferOwnership(controller.options.address).send();
        await avatar.methods.transferOwnership(controller.options.address).send();
        await controller.methods.newOrganization(avatar.options.address).send();
        await controller.methods.registerScheme(
            contributionReward.options.address,
            paramsHash,
            '0x0000001F', // full permissions,
            avatar.options.address,
        ).send();
        // END setup

        const descHash = '0x0000000000000000000000000000000000000000000000000000000000000123';
        const rewards = {
            eth: 4,
            externalToken: 3,
            nativeToken: 2,
            periodLength: 13,
            periods: 5,
            rep: 1,
        };
        const propose = contributionReward.methods.proposeContributionReward(
            avatar.options.address,
            descHash,
            rewards.rep,
            [
                rewards.nativeToken,
                rewards.eth,
                rewards.externalToken,
                rewards.periodLength,
                rewards.periods,
            ],
            externalToken.options.address,
            accounts[1].address,
        );
        const proposalId = await propose.call();
        const tx = await propose.send();

        const { proposals } = await sendQuery(`{
            proposals {
              proposalId
              genesisProtocol {
                submittedTime
              }
              contributionReward {
                beneficiary
              }
            }
        }`);

        expect(proposals.length).toEqual(1);
        expect(proposals).toContainEqual({
            proposalId,
            contributionReward: {beneficiary: accounts[1].address.toLowerCase()},
            genesisProtocol: {submittedTime: (await web3.eth.getBlock(tx.blockNumber)).timestamp.toString()},
        });
    }, 100000);
});
