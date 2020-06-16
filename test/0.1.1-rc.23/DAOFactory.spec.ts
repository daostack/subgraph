import { getArcVersion,
         getContractAddresses,
         getOptions,
         getPackageVersion,
         getWeb3,
         sendQuery,
         writeToIPFS } from './util';

const DAOFactory = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/DAOFactory.json');
const DAOToken = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/DAOToken.json');
const Avatar = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/Avatar.json');
const ContributionReward = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/ContributionReward.json');
const GenesisProtocol = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/GenesisProtocol.json');

describe('DAOFactory', () => {
  let web3;
  let addresses;
  let opts;
  let daoFactory;
  let genesisProtocol;
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

  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);
    daoFactory = new web3.eth.Contract(DAOFactory.abi, addresses.DAOFactoryInstance, opts);
    genesisProtocol = await new web3.eth.Contract(GenesisProtocol.abi, addresses.GenesisProtocol, opts);
  });

  it('Controller e2e', async () => {
    let nativeTokenData = await new web3.eth.Contract(DAOToken.abi)
                                .methods
                                .initialize('TEST', 'TST', 0, daoFactory.options.address)
                                .encodeABI();
    let encodedForgeOrgParams = web3.eth.abi.encodeParameters(
      ['string', 'bytes', 'address[]', 'uint256[]', 'uint256[]', 'uint64[3]'],
      [
        'Test DAO',
        nativeTokenData,
        [opts.from],
        [0],
        [0],
        getPackageVersion(),
      ],
    );

    // Add a scheme
    let crData = await new web3.eth.Contract(ContributionReward.abi)
    .methods
    .initialize(
      '0x0000000000000000000000000000000000000000',
      addresses.GenesisProtocol,
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
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    )
    .encodeABI();

    const getBytesLength = function(bytes) {
        return Number(bytes.slice(2).length) / 2;
    };
    let metadata = 'meta data';
    let metadataHash = await writeToIPFS(metadata);

    let encodedSetSchemesParams = web3.eth.abi.encodeParameters(
      ['bytes32[]', 'bytes', 'uint256[]', 'bytes4[]', 'string'],
      [
        [web3.utils.fromAscii('ContributionReward')],
        crData,
        [getBytesLength(crData)],
        ['0x0000000F'],
        metadataHash,
      ],
    );

    let tx = daoFactory.methods.forgeOrg(
      encodedForgeOrgParams,
      encodedSetSchemesParams,
    );

    let avatarAddress = await tx.call();
    tx = await tx.send();

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
            isRegistered
        }
        metadataHash
        metadata
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
          address: addresses.DAOFactoryInstance.toLowerCase(),
          contributionRewardParams: null,
          name: 'DAOFactoryInstance',
          isRegistered: false,
        },
        {
          address: contributionRewardAddress.toLowerCase(),
          contributionRewardParams: {
              votingMachine: genesisProtocol.options.address.toLowerCase(),
          },
          name: 'ContributionReward',
          isRegistered: true,
        },
      ],
      metadata,
      metadataHash,
    });
  }, 120000);
});
