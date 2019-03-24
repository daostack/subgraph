import {
  getContractAddresses,
  getOptions,
  getWeb3,
  sendQuery,
  waitUntilTrue,
} from './util';

const Avatar = require('@daostack/arc/build/contracts/Avatar.json');
const DAOToken = require('@daostack/arc/build/contracts/DAOToken.json');
const Reputation = require('@daostack/arc/build/contracts/Reputation.json');
const UController = require('@daostack/arc/build/contracts/UController.json');

describe('UController', () => {
  let web3;
  let addresses;
  let opts;
  let uController;
  let reputation;
  let daoToken;
  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);
    uController = new web3.eth.Contract(
      UController.abi,
      addresses.UController,
      opts,
    );
    reputation = await new web3.eth.Contract(Reputation.abi, undefined, opts).deploy({
      data: Reputation.bytecode,
      arguments: [],
    }).send();

    daoToken = await new web3.eth.Contract(DAOToken.abi, undefined, opts)
    .deploy({
      data: DAOToken.bytecode,
      arguments: ['TEST', 'TST', 1000000000],
    })
    .send();
  });

  it('Sanity', async () => {
    const getDAOs = `{
      daos {
        id
      }
    }`;

    const daosIsIndexed = async () => {
      return (await sendQuery(getDAOs)).daos.length > 1;
    };

    await waitUntilTrue(daosIsIndexed);

    let { daos } = await sendQuery(getDAOs);
    let prevDAOsCount = daos.length;

    const avatar = await new web3.eth.Contract(Avatar.abi, undefined, opts)
      .deploy({
        data: Avatar.bytecode,
        arguments: [
          'Test',
          daoToken.options.address,
          reputation.options.address,
        ],
      })
      .send();

    await avatar.methods.transferOwnership(uController.options.address).send();
    let txs = [];
    txs.push(
      await uController.methods.newOrganization(avatar.options.address).send(),
    );

    daos = (await sendQuery(getDAOs)).daos;

    expect(daos.length).toEqual(prevDAOsCount);
  }, 20000);
});
