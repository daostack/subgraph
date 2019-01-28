import {
  createSubscriptionObservable,
  getContractAddresses,
  getOptions,
  getWeb3,
  waitUntilTrue,
} from './util';

const Reputation = require('@daostack/arc/build/contracts/Reputation.json');
const gql = require('graphql-tag');

describe('Subscriptions Loop', () => {
  let web3;
  let addresses;
  let opts;
  let reputation;
  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);
    reputation = new web3.eth.Contract(
      Reputation.abi,
      addresses.Reputation,
      opts,
    );
  });
  it('Run 10 subscriptions and test for updates', async () => {
    const accounts = web3.eth.accounts.wallet;
    const SUBSCRIBE_QUERY = gql`
      subscription {
        reputationMints {
          contract
          amount
          address
        }
      }
    `;

    const subscriptionClient = await createSubscriptionObservable(
      SUBSCRIBE_QUERY, // Subscription query
      // {address: accounts[0].address.toLowerCase()} // Query variables
    );

    let event;
    for (let i = 1 ; i <= 10 ; i++) {
      let nextWasCalled = false;

      const consumer = await subscriptionClient.subscribe(
        (eventData) => {
          // Do something on receipt of the event
          nextWasCalled = true;
          event = eventData.data.reputationMints;
        },
        (err) => {
          expect(true).toEqual(false);
        },
      );

      await reputation.methods.mint(accounts[4].address, i.toString()).send();

      // wait until the subscription callback has been called
      await waitUntilTrue(() => nextWasCalled);

      expect(event).toContainEqual({
        address: accounts[4].address.toLowerCase(),
        amount: i.toString(),
        contract: reputation.options.address.toLowerCase(),
      });
      consumer.unsubscribe();
    }
  }, 25000);
});
