import { getArcVersion, getContractAddresses, getOptions, getOrgName, getWeb3, sendQuery } from './util';
const Avatar = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/Avatar.json');

describe('Avatar', () => {
  let web3;
  let addresses;
  let opts;
  const orgName = getOrgName();

  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);
  });

  it('Sanity', async () => {
    const accounts = web3.eth.accounts.wallet;
    const avatar = new web3.eth.Contract(Avatar.abi, addresses.Avatar, opts);
    const vault = await avatar.methods.vault().call();

    const avatarQuery = `{
      avatarContract(id: "${addresses.Avatar.toLowerCase()}") {
        id
        address
        name
        nativeToken
        nativeReputation
        balance
        owner
        metadataHash
      }
    }`;
    const { avatarContract } = await sendQuery(avatarQuery, 5000);
    let balance = await web3.eth.getBalance(vault);
    expect(avatarContract).toEqual({
      id: addresses.Avatar.toLowerCase(),
      address: addresses.Avatar.toLowerCase(),
      name: orgName,
      nativeToken: addresses.NativeToken.toLowerCase(),
      nativeReputation: addresses.NativeReputation.toLowerCase(),
      balance,
      owner: addresses.Controller.toLowerCase(),
      metadataHash: 'Deployment Metadata',
    });

    await web3.eth.sendTransaction({
      from: accounts[0].address,
      to: addresses.Avatar,
      value: web3.utils.toWei('1'),
      gas: 2000000,
    });

    balance = await web3.eth.getBalance(vault);
    const newAvatar = (await sendQuery(avatarQuery, 5000)).avatarContract;
    expect(newAvatar).toEqual({
      id: addresses.Avatar.toLowerCase(),
      address: addresses.Avatar.toLowerCase(),
      name: orgName,
      nativeToken: addresses.NativeToken.toLowerCase(),
      nativeReputation: addresses.NativeReputation.toLowerCase(),
      balance,
      owner: addresses.Controller.toLowerCase(),
      metadataHash: 'Deployment Metadata',
    });
  }, 20000);
});
