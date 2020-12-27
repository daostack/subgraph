import {
    getArcVersion,
    getContractAddresses,
    getOptions,
    getWeb3,
    increaseTime,
    nullParamsHash,
    sendQuery,
    waitUntilTrue,
    writeProposalIPFS,
} from './util';

const ContinuousLocking4Reputation = require('@daostack/migration/contracts/' + getArcVersion() + '/ContinuousLocking4Reputation.json');
const ContinuousLocking4ReputationFactory = require('@daostack/migration/contracts/' + getArcVersion() + '/ContinuousLocking4ReputationFactory.json');
const DAOToken = require('@daostack/migration/contracts/' + getArcVersion() + '/DAOToken.json');
const GenesisProtocol = require('@daostack/migration/contracts/' + getArcVersion() + '/GenesisProtocol.json');
const SchemeRegistrar = require('@daostack/migration/contracts/' + getArcVersion() + '/SchemeRegistrar.json');

describe('ContinuousLocking4Reputation', () => {
    let web3;
    let addresses;
    let opts;
    let continuousLocking4Reputation;
    let continuousLocking4ReputationFactory;
    let schemeRegistrar;
    let genesisProtocol;
    beforeAll(async () => {
        web3 = await getWeb3();
        addresses = getContractAddresses();
        opts = await getOptions(web3);
        continuousLocking4Reputation = new web3.eth.Contract(
          ContinuousLocking4Reputation.abi,
          addresses.ContinuousLocking4Reputation,
          opts,
        );
        continuousLocking4ReputationFactory = new web3.eth.Contract(
          ContinuousLocking4ReputationFactory.abi,
          addresses.ContinuousLocking4ReputationFactory,
          opts,
        );
        schemeRegistrar = new web3.eth.Contract(SchemeRegistrar.abi, addresses.SchemeRegistrar, opts);
        genesisProtocol = new web3.eth.Contract(
            GenesisProtocol.abi,
            addresses.GenesisProtocol,
            opts,
        );
    });

    it('Sanity', async () => {
      const accounts = web3.eth.accounts.wallet;
      let reputationReward = 850000;
      let startTime = (await web3.eth.getBlock('latest')).timestamp;
      let periodsUnit = (30 * 60 * 60);
      let redeemEnableTime = startTime + (30 * 60 * 60);
      let maxLockingPeriod = 12;
      let repRewardConstA = 85000;
      let repRewardConstB = 900;
      let periodsCap = 100;
      const continuousLocking4ReputationCreateTx =
      continuousLocking4ReputationFactory.methods.createCL4R(
        addresses.Avatar,
        reputationReward,
        startTime,
        periodsUnit,
        redeemEnableTime,
        maxLockingPeriod,
        repRewardConstA,
        repRewardConstB,
        periodsCap,
        addresses.NativeToken,
        '0x0000000000000000000000000000000000000001',
      );

      const continuousLocking4ReputationAddress = await continuousLocking4ReputationCreateTx.call();

      await continuousLocking4ReputationCreateTx.send(
          { from: accounts[0].address },
      );

      const getContractInfo = `{
          contractInfos(where: {address: "${continuousLocking4ReputationAddress.toLowerCase()}"}) {
              name
          }
      }`;

      const schemeIsIndexed = async () => {
          return (await sendQuery(getContractInfo)).contractInfos.length > 0;
      };

      await waitUntilTrue(schemeIsIndexed);

      let { contractInfos } = await sendQuery(getContractInfo);

      expect(contractInfos).toContainEqual({
          name: 'ContinuousLocking4Reputation',
      });

      // Register the schemes
      let proposeScheme = schemeRegistrar.methods.proposeScheme(
          addresses.Avatar,
          continuousLocking4ReputationAddress,
          '0x0000000000000000000000000000000000000000',
          '0x0000001f',
          '0x000000000000000000000000000000000000000000000000000000000000abcd',
      );

      const proposeSchemeProposalId = await proposeScheme.call();
      await proposeScheme.send();

      for (let i = 0; i < 4; i++) {
          await genesisProtocol.methods.vote(
          proposeSchemeProposalId,
          1,
          0,
          accounts[0].address /* unused by the contract */)
          .send({ from: accounts[i].address });
      }

      continuousLocking4Reputation = new web3.eth.Contract(
          ContinuousLocking4Reputation.abi,
          continuousLocking4ReputationAddress,
          opts,
        );

      const schemeRegisteredIsIndexed = async () => {
          return (await sendQuery(
            `
              {
                controllerSchemes(where: { address: "${continuousLocking4ReputationAddress.toLowerCase()}" }) {
                  id
                }
              }
            `,
          )).controllerSchemes.length > 0;
        };

      await waitUntilTrue(schemeRegisteredIsIndexed);

      const { controllerSchemes } = await sendQuery(`{
            controllerSchemes(where: { address: "${continuousLocking4ReputationAddress.toLowerCase()}" }) {
                name
                dao {
                  id
                }
                address
                paramsHash
                gpQueue {
                  id
                }
                numberOfQueuedProposals
                numberOfPreBoostedProposals
                numberOfBoostedProposals
                numberOfExpiredInQueueProposals
                isRegistered
                continuousLocking4ReputationParams {
                  startTime
                  batchTime
                  redeemEnableTime
                  token
                }
            }
          }`);

      expect(controllerSchemes).toContainEqual({
            name: 'ContinuousLocking4Reputation',
            dao: {
              id: addresses.Avatar.toLowerCase(),
            },
            address: continuousLocking4ReputationAddress.toLowerCase(),
            paramsHash: nullParamsHash,
            gpQueue: null,
            numberOfBoostedProposals: '0',
            numberOfExpiredInQueueProposals: '0',
            numberOfPreBoostedProposals: '0',
            numberOfQueuedProposals: '0',
            isRegistered: true,
            continuousLocking4ReputationParams: {
                batchTime: periodsUnit.toString(),
                redeemEnableTime: redeemEnableTime.toString(),
                startTime: startTime.toString(),
                token: addresses.NativeToken.toLowerCase(),
            },
          });

      const daoToken = await new web3.eth.Contract(DAOToken.abi, addresses.NativeToken.toLowerCase(), opts);
        // // console.log(await continuousLocking4Reputation.methods.agreementHash().call());
      await daoToken.methods.approve(continuousLocking4Reputation.options.address, 1).send();

      const { blockNumber } = await continuousLocking4Reputation.methods.lock(1, 12, 0, '0x0000000000000000000000000000000000000001').send();
      const { timestamp } = await web3.eth.getBlock(blockNumber);
      const locksQuery = `{
          cl4Rlocks {
            lockingId
            lockingTime
            scheme {
              address
            }
            dao {
              id
            }
            period
            batchIndexRedeemed
            amount
            redeemed
            released
            redeemedAt
            releasedAt
          }
        }`;

      let cl4Rlocks = (await sendQuery(locksQuery)).cl4Rlocks;

      expect(cl4Rlocks).toContainEqual({
          amount: '1',
          batchIndexRedeemed: null,
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          lockingId: '1',
          lockingTime: timestamp.toString(),
          period: '12',
          redeemed: false,
          redeemedAt: null,
          released: false,
          releasedAt: null,
          scheme: {
            address: continuousLocking4ReputationAddress.toLowerCase(),
          },
      });

      await increaseTime(periodsUnit + 1, web3);
      let redeemBlock = (
        await continuousLocking4Reputation.methods.redeem(accounts[0].address, '1').send()
      ).blockNumber;
      const redeemTimestamp = (await web3.eth.getBlock(redeemBlock)).timestamp;

      cl4Rlocks = (await sendQuery(locksQuery)).cl4Rlocks;

      expect(cl4Rlocks).toContainEqual({
          amount: '1',
          batchIndexRedeemed: '0',
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          lockingId: '1',
          lockingTime: timestamp.toString(),
          period: '12',
          redeemed: true,
          redeemedAt: redeemTimestamp.toString(),
          released: false,
          releasedAt: null,
          scheme: {
            address: continuousLocking4ReputationAddress.toLowerCase(),
          },
      });

      await increaseTime(periodsUnit * 11 + 1, web3);
      let releaseBlock = (
        await continuousLocking4Reputation.methods.release(accounts[0].address, '1').send()
      ).blockNumber;
      const releaseTimestamp = (await web3.eth.getBlock(releaseBlock)).timestamp;

      cl4Rlocks = (await sendQuery(locksQuery)).cl4Rlocks;

      expect(cl4Rlocks).toContainEqual({
          amount: '1',
          batchIndexRedeemed: '0',
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          lockingId: '1',
          lockingTime: timestamp.toString(),
          period: '12',
          redeemed: true,
          redeemedAt: redeemTimestamp.toString(),
          released: true,
          releasedAt: releaseTimestamp.toString(),
          scheme: {
            address: continuousLocking4ReputationAddress.toLowerCase(),
          },
      });

    }, 100000);
});
