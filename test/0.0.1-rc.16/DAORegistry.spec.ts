import { getContractAddresses, getOptions, getWeb3, sendQuery } from './util';

const DAORegistry = require('@daostack/arc-hive/build/contracts/DAORegistry.json');
const Avatar = require('@daostack/arc/build/contracts/Avatar.json');
const DAOToken = require('@daostack/arc/build/contracts/DAOToken.json');
const Reputation = require('@daostack/infra/build/contracts/Reputation.json');

describe('DAORegistry', () => {
  let web3;
  let opts;
  let addresses;
  let daoRegistry;

  const deployContract = (abi: any, args: any[]) => {
    return new web3.eth.Contract(abi.abi, undefined, opts)
      .deploy({
        data: abi.bytecode,
        arguments: args
      }).send();
  }

  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);
    daoRegistry = new web3.eth.Contract(DAORegistry.abi, addresses.DAORegistry, opts);
  });

  it('Sanity', async () => {
    // Propose a new Avatar contract be added to the DAORegistry
    const daoToken = await deployContract(DAOToken, ['name', 'sym', 40000000]);
    const daoTokenAddress = daoToken.options.address.toLowerCase();
    const reputation = await deployContract(Reputation, []);
    const reputationAddress = reputation.options.address.toLowerCase();
    const avatar = await deployContract(Avatar, ['test', daoTokenAddress, reputationAddress]);
    const avatarAddress = avatar.options.address.toLowerCase();

    await daoRegistry.methods.propose(avatarAddress).send();

    // Ensure the new avatar is being tracked by
    // transfering ownership to another account
    const accounts = web3.eth.accounts.wallet;
    await avatar.methods.transferOwnership(accounts[1].address).send();

    const { avatarContract } = await sendQuery(`{
      avatarContract(id: "${avatarAddress}") {
        address
        name
        nativeToken
        nativeReputation
        owner
      }
    }`, 3000);

    expect(avatarContract).toEqual({
      address: avatarAddress,
      name: 'test',
      nativeToken: daoTokenAddress,
      nativeReputation: reputationAddress,
      owner: accounts[1].address.toLowerCase(),
    });
  }, 20000);
});
