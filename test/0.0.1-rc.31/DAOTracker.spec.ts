import { getContractAddresses, getOptions, getWeb3, sendQuery } from './util';

const DAOTracker = require('@daostack/arc/build/contracts/DAOTracker.json');
const Avatar = require('@daostack/arc/build/contracts/Avatar.json');
const Controller = require('@daostack/arc/build/contracts/Controller.json');
const UController = require('@daostack/arc/build/contracts/UController.json');
const DAOToken = require('@daostack/arc/build/contracts/DAOToken.json');
const Reputation = require('@daostack/arc/build/contracts/Reputation.json');
const ContributionReward = require('@daostack/arc/build/contracts/ContributionReward.json');
const GenesisProtocol = require('@daostack/arc/build/contracts/GenesisProtocol.json');

describe('DAOTracker', () => {
  let web3;
  let addresses;
  let opts;
  let daoTracker;
  let uController;
  let contributionReward;
  let genesisProtocol;
  let vmParamsHash;
  let schemeParamsHash;

  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);
    daoTracker = new web3.eth.Contract(DAOTracker.abi, addresses.DAOTracker, opts);
    uController = new web3.eth.Contract(UController.abi, addresses.UController, opts);
    contributionReward = new web3.eth.Contract(ContributionReward.abi, addresses.ContributionReward, opts);
    genesisProtocol = await new web3.eth.Contract(GenesisProtocol.abi, addresses.GenesisProtocol, opts);

    const gpParams = {
      queuedVoteRequiredPercentage: 50,
      queuedVotePeriodLimit: 60,
      boostedVotePeriodLimit: 5,
      preBoostedVotePeriodLimit: 0,
      thresholdConst: 2000,
      quietEndingPeriod: 0,
      proposingRepReward: 60,
      votersReputationLossRatio: 10,
      minimumDaoBounty: 15,
      daoBountyConst: 10,
      activationTime: 0,
      voteOnBehalf: '0x0000000000000000000000000000000000000000',
    };
    const vmSetParams = genesisProtocol.methods.setParameters(
      [
        gpParams.queuedVoteRequiredPercentage,
        gpParams.queuedVotePeriodLimit,
        gpParams.boostedVotePeriodLimit,
        gpParams.preBoostedVotePeriodLimit,
        gpParams.thresholdConst,
        gpParams.quietEndingPeriod,
        gpParams.proposingRepReward,
        gpParams.votersReputationLossRatio,
        gpParams.minimumDaoBounty,
        gpParams.daoBountyConst,
        gpParams.activationTime,
      ],
      gpParams.voteOnBehalf,
    );
    vmParamsHash = await vmSetParams.call();
    await vmSetParams.send();

    const schemeSetParams = contributionReward.methods.setParameters(vmParamsHash, genesisProtocol.options.address);
    schemeParamsHash = await schemeSetParams.call();
    await schemeSetParams.send();
  });

  const e2eControllerTest = async (isUController: boolean) => {
    // Start deploying a new DAO
    const nativeToken = await new web3.eth.Contract(DAOToken.abi, undefined, opts)
      .deploy({ data: DAOToken.bytecode, arguments: [ 'Test Token', 'TST', '10000000000' ] })
      .send();

    const reputation = await new web3.eth.Contract(Reputation.abi, undefined, opts)
      .deploy({ data: Reputation.bytecode, arguments: [] })
      .send();

    const avatar = await new web3.eth.Contract(Avatar.abi, undefined, opts)
      .deploy({
        data: Avatar.bytecode,
        arguments: [ 'Test DAO', nativeToken.options.address, reputation.options.address ] })
      .send();

    let controller;

    if (!isUController) {
      controller = await new web3.eth.Contract(Controller.abi, undefined, opts)
        .deploy({ data: Controller.bytecode, arguments: [ avatar.options.address ] })
        .send();
    } else {
      controller = uController;
    }

    // Add the new DAO to the DAOTracker
    await daoTracker.methods.track(avatar.options.address, controller.options.address)
      .send();

    const { daotrackerContract } = await sendQuery(`{
      daotrackerContract(id: "${daoTracker.options.address.toLowerCase()}") {
        id
        address
        owner
      }
    }`, 5000);

    expect(daotrackerContract).toMatchObject({
      id: daoTracker.options.address.toLowerCase(),
      address: daoTracker.options.address.toLowerCase(),
      owner: web3.eth.defaultAccount.toLowerCase(),
    });

    // Finish setting up the new DAO, and verify the contract entities are added
    await reputation.methods.transferOwnership(controller.options.address).send();

    const { reputationContract } = await sendQuery(`{
      reputationContract(id: "${reputation.options.address.toLowerCase()}") {
        id
        address
      }
    }`, 5000);

    expect(reputationContract).toMatchObject({
      id: reputation.options.address.toLowerCase(),
      address: reputation.options.address.toLowerCase(),
    });

    await nativeToken.methods.transferOwnership(controller.options.address).send();

    const { tokenContract } = await sendQuery(`{
      tokenContract(id: "${nativeToken.options.address.toLowerCase()}") {
        id
        address
        owner
      }
    }`, 5000);

    expect(tokenContract).toMatchObject({
      id: nativeToken.options.address.toLowerCase(),
      address: nativeToken.options.address.toLowerCase(),
      owner: controller.options.address.toLowerCase(),
    });

    await avatar.methods.transferOwnership(controller.options.address).send();

    const { avatarContract } = await sendQuery(`{
      avatarContract(id: "${avatar.options.address.toLowerCase()}") {
        id
        address
        name
        nativeToken
        nativeReputation
        owner
      }
    }`, 5000);

    expect(avatarContract).toMatchObject({
      id: avatar.options.address.toLowerCase(),
      address: avatar.options.address.toLowerCase(),
      name: 'Test DAO',
      nativeToken: nativeToken.options.address.toLowerCase(),
      nativeReputation: reputation.options.address.toLowerCase(),
      owner: controller.options.address.toLowerCase(),
    });

    if (isUController) {
      // Add the new organization to the UController
      await controller.methods.newOrganization(avatar.options.address).send();
    }

    // Add a scheme
    await controller.methods.registerScheme(
      contributionReward.options.address,
      schemeParamsHash,
      '0x0000001F',
      avatar.options.address,
    ).send();

    // Ensure the scheme is in the subgraph
    const { controllerSchemes } = await sendQuery(`{
      controllerSchemes {
        dao {
          id
        }
        address
      }
    }`, 15000);

    expect(controllerSchemes).toContainEqual({
      dao: {
        id: avatar.options.address.toLowerCase(),
      },
      address: contributionReward.options.address.toLowerCase(),
    });

    // Ensure the new DAO is in the subgraph
    const { dao } = await sendQuery(`{
      dao(id: "${avatar.options.address.toLowerCase()}") {
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
      }
    }`, 15000);

    expect(dao).toMatchObject({
      id: avatar.options.address.toLowerCase(),
      name: 'Test DAO',
      nativeToken: {
        id: nativeToken.options.address.toLowerCase(),
        dao: {
          id: avatar.options.address.toLowerCase(),
        },
      },
      nativeReputation: {
        id: reputation.options.address.toLowerCase(),
        dao: {
          id: avatar.options.address.toLowerCase(),
        },
      },
    });

    return {
      avatar,
    };
  };

  it('Controller e2e', async () => {
    await e2eControllerTest(false);
  }, 120000);

  it('UController e2e', async () => {
    await e2eControllerTest(true);
  }, 120000);

  it('Blacklist & Reset DAO', async () => {
    const { avatar } = await e2eControllerTest(false);

    // Blacklist the deployed DAO
    await daoTracker.methods.blacklist(avatar.options.address, '').send();

    // Ensure the blacklisted DAO is in the subgraph
    {
      const { blacklistedDAO } = await sendQuery(`{
        blacklistedDAO(id: "${avatar.options.address.toLowerCase()}") {
          id
          address
          tracker {
            id
          }
          explanationHash
        }
      }`, 5000);

      expect(blacklistedDAO).toMatchObject({
        id: avatar.options.address.toLowerCase(),
        address: avatar.options.address.toLowerCase(),
        tracker: {
          id: daoTracker.options.address.toLowerCase(),
        },
        explanationHash: '',
      });
    }

    // Reset the DAO
    await daoTracker.methods.reset(avatar.options.address, '').send();

    // Ensure the blacklisted DAO is no longer in the subgraph
    {
      const { blacklistedDAO } = await sendQuery(`{
        blacklistedDAO(id: "${avatar.options.address.toLowerCase()}") {
          id
          address
          tracker {
            id
          }
          explanationHash
        }
      }`, 5000);

      expect(blacklistedDAO).toBeFalsy();
    }

    // Ensure the reset DAO is in the subgraph
    const { resetDAO } = await sendQuery(`{
      resetDAO(id: "${avatar.options.address.toLowerCase()}") {
        id
        address
        explanationHash
      }
    }`);

    expect(resetDAO).toMatchObject({
      id: avatar.options.address.toLowerCase(),
      address: avatar.options.address.toLowerCase(),
      explanationHash: '',
    });
  }, 120000);
});
