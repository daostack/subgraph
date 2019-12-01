import { getContractAddresses, getOrgName, getWeb3, sendQuery, waitUntilTrue } from './util';

describe('Avatar', () => {
  let web3;
  let addresses;
  const orgName = getOrgName();

  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
  });

  it('Sanity', async () => {
    const accounts = web3.eth.accounts.wallet;

    const avatarQuery = `{
      avatarContract(id: "${addresses.Avatar.toLowerCase()}") {
        id
        address
        name
        nativeToken
        nativeReputation
        balance
        owner
      }
    }`;
    const { avatarContract } = await sendQuery(avatarQuery, 5000);
    let balance = await web3.eth.getBalance(addresses.Avatar.toLowerCase());
    expect(avatarContract).toEqual({
      id: addresses.Avatar.toLowerCase(),
      address: addresses.Avatar.toLowerCase(),
      name: orgName,
      nativeToken: addresses.NativeToken.toLowerCase(),
      nativeReputation: addresses.NativeReputation.toLowerCase(),
      balance,
      owner: addresses.Controller.toLowerCase(),
    });

    await web3.eth.sendTransaction({
      from: accounts[0].address,
      to: addresses.Avatar,
      value: web3.utils.toWei('1'),
      gas: 2000000,
      data: '0xABCD',
    });

    balance = await web3.eth.getBalance(addresses.Avatar.toLowerCase());
    const newAvatar = (await sendQuery(avatarQuery, 5000)).avatarContract;
    expect(newAvatar).toEqual({
      id: addresses.Avatar.toLowerCase(),
      address: addresses.Avatar.toLowerCase(),
      name: orgName,
      nativeToken: addresses.NativeToken.toLowerCase(),
      nativeReputation: addresses.NativeReputation.toLowerCase(),
      balance,
      owner: addresses.Controller.toLowerCase(),
    });
  }, 20000);
});
