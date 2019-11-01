import { getContractAddresses, getOptions, getWeb3, sendQuery } from './util';

const DAOTracker = require('@daostack/arc/build/contracts/DAOTracker.json');
const Avatar = require('@daostack/arc/build/contracts/Avatar.json');
const Controller = require('@daostack/arc/build/contracts/Controller.json');
const UController = require('@daostack/arc/build/contracts/UController.json');
const DAOToken = require('@daostack/arc/build/contracts/DAOToken.json');
const Reputation = require('@daostack/arc/build/contracts/Reputation.json');
const ContributionReward = require('@daostack/arc/build/contracts/ContributionReward.json');
const AbsoluteVote = require('@daostack/arc/build/contracts/AbsoluteVote.json');

describe('DAOTracker', () => {
  let web3;
  let addresses;
  let opts;
  let daoTracker;
  let uController;
  let contributionReward;
  let absVote;
  let vmParamsHash;
  let schemeParamsHash;

  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);
    daoTracker = new web3.eth.Contract(DAOTracker.abi, addresses.DAOTracker, opts);
    uController = new web3.eth.Contract(UController.abi, addresses.UController, opts);
    contributionReward = new web3.eth.Contract(ContributionReward.abi, addresses.ContributionReward, opts);
    absVote = await new web3.eth.Contract(AbsoluteVote.abi, undefined, opts)
      .deploy({ data: AbsoluteVote.bytecode, arguments: [] })
      .send();

    const vmSetParams = absVote.methods.setParameters(20, '0x0000000000000000000000000000000000000000');
    vmParamsHash = await vmSetParams.call();
    await vmSetParams.send();

    const schemeSetParams = contributionReward.methods.setParameters(vmParamsHash, absVote.options.address);
    schemeParamsHash = schemeSetParams.call();
    schemeSetParams.send();
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
      controller = await new web3.eth.Contracts(Controller.abi, undefined, opts)
        .deploy({ data: Controller.bytecode, arguments: [ avatar.options.address ] });
    } else {
      controller = uController;
    }

    // Add the new DAO to the DAOTracker
    await daoTracker.methods.track(avatar.options.address, controller.options.address)
      .send();

    // Finish setting up the new DAO
    await reputation.methods.transferOwnership(controller.options.address).send();
    await nativeToken.methods.transferOwnership(controller.options.address).send();
    await avatar.methods.transferOwnership(controller.options.address).send();

    // Ensure the new DAO is in the subgraph
    const { dao } = await sendQuery(`{
      dao(id: "${avatar.options.address}") {
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
        reputationHoldersCount
      }
    }`, 5000);

    expect(dao).toMatchObject({
      id: avatar.options.address,
      name: 'Test DAO',
      nativeToken: {
        id: nativeToken.options.address,
        dao: {
          id: avatar.options.address,
        },
      },
      nativeReputation: {
        id: reputation.options.address,
        dao: {
          id: avatar.options.address,
        },
      },
      reputationHoldersCount: '0',
    });

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
    }`, 5000);

    expect(controllerSchemes).toContainEqual({
      dao: {
        id: avatar.options.address,
      },
      address: contributionReward.options.address,
    });

    return {
      avatar,
    };
  };

  it('Controller e2e', async () => {
    await e2eControllerTest(false);
  });

  it('UController e2e', async () => {
    await e2eControllerTest(true);
  });

  it('Blacklist & Reset DAO', async () => {
    const { avatar } = await e2eControllerTest(false);

    // Blacklist the deployed DAO
    await daoTracker.methods.blacklist(avatar.options.address, '').send();

    // Ensure the blacklisted DAO is in the subgraph
    {
      const { blacklistedDAO } = await sendQuery(`{
        blacklistedDAO(id: "${avatar.options.address}") {
          id
          address
          tracker
          explanationHash
        }
      }`, 5000);

      expect(blacklistedDAO).toMatchObject({
        id: avatar.options.address,
        address: avatar.options.address,
        tracker: daoTracker.options.address,
        explanationHash: '',
      });
    }

    // Reset the DAO
    await daoTracker.methods.reset(avatar.options.address, '').send();

    // Ensure the blacklisted DAO is no longer in the subgraph
    {
      const { blacklistedDAO } = await sendQuery(`{
        blacklistedDAO(id: "${avatar.options.address}") {
          id
          address
          tracker
          explanationHash
        }
      }`, 5000);

      expect(blacklistedDAO).toBeFalsy();
    }

    // Ensure the reset DAO is in the subgraph
    const { resetDAO } = await sendQuery(`{
      resetDAO(id: "${avatar.options.address}') {
        id
        address
        explanationHash
      }
    }`);

    expect(resetDAO).toMatchObject({
      id: avatar.options.address,
      address: avatar.options.address,
      explanationHash: '',
    });
  });
});
