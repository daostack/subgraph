import {
  createSubscriptionObservable,
  getContractAddresses,
  getOptions,
  getWeb3,
  prepareReputation,
  registerAdminAccountScheme,
  waitUntilTrue,
} from './util';

const Controller = require('@daostack/migration-experimental/contracts/0.1.1-rc.0/Controller.json');
const Reputation = require('@daostack/migration-experimental/contracts/0.1.1-rc.0/Reputation.json');
const gql = require('graphql-tag');

describe('Subscriptions Loop', () => {
  let web3;
  let addresses;
  let opts;
  let reputation;
  let controller;
  let accounts;
  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);
    accounts = web3.eth.accounts.wallet;

    await prepareReputation(web3, addresses, opts, accounts);

    reputation = new web3.eth.Contract(
      Reputation.abi,
      addresses.NativeReputation,
      opts,
    );

    await registerAdminAccountScheme(web3, addresses, opts, accounts);
  }, 100000);

  it('Run 10 subscriptions and test for updates', async () => {
    controller = new web3.eth.Contract(Controller.abi, addresses.Controller, opts);
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

      await controller.methods.mintReputation(i.toString(), accounts[4].address)
      .send({from: accounts[0].address});
      // wait until the subscription callback has been called
      await waitUntilTrue(() => nextWasCalled);
      // this is done twice due to https://github.com/graphprotocol/graph-node/pull/1062
      nextWasCalled = false;
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
