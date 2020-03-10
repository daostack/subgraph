import {
  createSubscriptionObservable,
  getArcVersion,
  getContractAddresses,
  getOptions,
  getWeb3,
  prepareReputation,
  registerAdminAccountScheme,
  waitUntilTrue,
} from './util';

const Reputation = require('@daostack/migration/contracts/' + getArcVersion() + '/Reputation.json');
const Controller = require('@daostack/migration/contracts/' + getArcVersion() + '/Controller.json');

const gql = require('graphql-tag');

describe('Subscriptions', () => {
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

    reputation = new web3.eth.Contract(Reputation.abi, addresses.Reputation, opts);
    await registerAdminAccountScheme(web3, addresses, opts, accounts);
  }, 100000);

  it('Run one subscription and test for updates', async () => {
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
    await controller.methods.mintReputation('99', accounts[4].address).send({from: accounts[0].address});

    // wait until the subscription callback has been called
    await waitUntilTrue(() => nextWasCalled);
    // this is done twice due to https://github.com/graphprotocol/graph-node/pull/1062
    nextWasCalled = false;
    await waitUntilTrue(() => nextWasCalled);

    expect(event).toContainEqual({
      address: accounts[4].address.toLowerCase(),
      amount: '99',
      contract: reputation.options.address.toLowerCase(),
    });

    consumer.unsubscribe();
  }, 2500);
});
