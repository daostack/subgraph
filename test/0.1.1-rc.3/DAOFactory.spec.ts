import { getArcVersion, getContractAddresses, getOptions, getWeb3, sendQuery } from './util';

const DAOFactory = require('@daostack/migration/contracts/' + getArcVersion() + '/DAOFactory.json');
const DAOToken = require('@daostack/migration/contracts/' + getArcVersion() + '/DAOToken.json');
const Avatar = require('@daostack/migration/contracts/' + getArcVersion() + '/Avatar.json');
const ContributionReward = require('@daostack/migration/contracts/' + getArcVersion() + '/ContributionReward.json');
const GenesisProtocol = require('@daostack/migration/contracts/' + getArcVersion() + '/GenesisProtocol.json');

describe('DAOTracker', () => {
  let web3;
  let addresses;
  let opts;
  let daoFactory;
  let genesisProtocol;
  let vmParamsHash;

  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);
    daoFactory = new web3.eth.Contract(DAOFactory.abi, addresses.DAOFactoryInstance, opts);
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
  });

  it('Controller e2e', async () => {
    let nativeTokenData = await new web3.eth.Contract(DAOToken.abi)
                                .methods
                                .initialize('TEST', 'TST', 0, daoFactory.options.address)
                                .encodeABI();
    let tx = daoFactory.methods.forgeOrg(
      'Test DAO',
      nativeTokenData,
      [opts.from],
      [0],
      [0],
      [0, 1, 0],
    );

    let avatarAddress = await tx.call();
    await tx.send();

    const avatar = await new web3.eth.Contract(Avatar.abi, avatarAddress, opts);
    const nativeTokenAddress = await avatar.methods.nativeToken().call();
    const reputationAddress = await avatar.methods.nativeReputation().call();
    const controllerAddress = await avatar.methods.owner().call();

    const { daofactoryContract } = await sendQuery(`{
      daofactoryContract(id: "${daoFactory.options.address.toLowerCase()}") {
        id
        address
        packageName
        app
      }
    }`, 5000);

    expect(daofactoryContract).toMatchObject({
      id: daoFactory.options.address.toLowerCase(),
      address: daoFactory.options.address.toLowerCase(),
      packageName: 'DAOstack',
      app: addresses.App.toLowerCase(),
    });

    const { reputationContract } = await sendQuery(`{
      reputationContract(id: "${reputationAddress.toLowerCase()}") {
        id
        address
      }
    }`, 5000);

    expect(reputationContract).toMatchObject({
      id: reputationAddress.toLowerCase(),
      address: reputationAddress.toLowerCase(),
    });

    const { tokenContract } = await sendQuery(`{
      tokenContract(id: "${nativeTokenAddress.toLowerCase()}") {
        id
        address
        owner
      }
    }`, 5000);

    expect(tokenContract).toMatchObject({
      id: nativeTokenAddress.toLowerCase(),
      address: nativeTokenAddress.toLowerCase(),
      owner: controllerAddress.toLowerCase(),
    });

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
      nativeToken: nativeTokenAddress.toLowerCase(),
      nativeReputation: reputationAddress.toLowerCase(),
      owner: controllerAddress.toLowerCase(),
    });

    // Add a scheme
    let crData = await new web3.eth.Contract(ContributionReward.abi)
    .methods
    .initialize(avatar.options.address, addresses.GenesisProtocol, vmParamsHash)
    .encodeABI();

    const getBytesLength = function(bytes) {
        return Number(bytes.slice(2).length) / 2;
    };

    tx = await daoFactory.methods.setSchemes(
        avatar.options.address,
        [web3.utils.fromAscii('ContributionReward')],
        crData,
        [getBytesLength(crData)],
        ['0x0000000F'],
        'metaData',
    ).send();
    const contributionRewardAddress = tx.events.SchemeInstance.returnValues._scheme;
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
      address: contributionRewardAddress.toLowerCase(),
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
        schemes {
            name
            address
            contributionRewardParams {
                votingMachine
            }
        }
      }
    }`, 15000);

    expect(dao).toMatchObject({
      id: avatar.options.address.toLowerCase(),
      name: 'Test DAO',
      nativeToken: {
        id: nativeTokenAddress.toLowerCase(),
        dao: {
          id: avatar.options.address.toLowerCase(),
        },
      },
      nativeReputation: {
        id: reputationAddress.toLowerCase(),
        dao: {
          id: avatar.options.address.toLowerCase(),
        },
      },
      schemes: [
        {
          address: contributionRewardAddress.toLowerCase(),
          contributionRewardParams: {
              votingMachine: genesisProtocol.options.address.toLowerCase(),
          },
          name: 'ContributionReward',
        },
      ],
    });
  }, 120000);
});
