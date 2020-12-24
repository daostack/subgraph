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

describe('ContinuousLocking4Reputation', () => {
    let web3;
    let addresses;
    let opts;
    let continuousLocking4Reputation;
    beforeAll(async () => {
        web3 = await getWeb3();
        addresses = getContractAddresses();
        opts = await getOptions(web3);
        continuousLocking4Reputation = new web3.eth.Contract(ContinuousLocking4Reputation.abi, addresses.ContinuousLocking4Reputation, opts);
    });

    it('Sanity', async () => {
        const accounts = web3.eth.accounts.wallet;
        const { controllerSchemes } = await sendQuery(`{
            controllerSchemes(where: { address: "${addresses.ContinuousLocking4Reputation.toLowerCase()}" }) {
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
            name: "ContinuousLocking4Reputation",
            dao: {
              id: addresses.Avatar.toLowerCase(),
            },
            address: addresses.ContinuousLocking4Reputation.toLowerCase(),
            paramsHash: nullParamsHash,
            gpQueue: null,
            numberOfBoostedProposals: '0',
            numberOfExpiredInQueueProposals: '0',
            numberOfPreBoostedProposals: '0',
            numberOfQueuedProposals: '0',
            isRegistered: true,
            continuousLocking4ReputationParams: {
                batchTime: "20",
                redeemEnableTime: "20",
                startTime: "0",
                token: addresses.NativeToken.toLowerCase(),
            }
          });

    }, 100000);
});
