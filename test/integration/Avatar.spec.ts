import { getWeb3, getContractAddresses, getOptions, query } from "./util";

const Avatar = require("@daostack/arc/build/contracts/Avatar.json");

describe("Avatar", () => {
  let web3, addresses, avatar;
  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    const opts = await getOptions(web3);
    avatar = new web3.eth.Contract(Avatar.abi, addresses.Avatar, opts);
  });

  it("Sanity", async () => {
    const accounts = web3.eth.accounts.wallet;

    await web3.eth.sendTransaction({
      from: accounts[0].address,
      to: avatar.options.address,
      value: 1,
      gas: 2000000
    });

    const { avatars } = await query(`{
      avatars {
        id
        address
        name
        nativeToken
        nativeReputation
        balance
        owner
      }
    }`);

    expect(avatars.length).toEqual(1);
    expect(avatars).toContainEqual({
      id: addresses.Avatar,
      address: addresses.Avatar,
      name: "TESTDAO",
      nativeToken: addresses.DAOToken,
      nativeReputation: addresses.Reputation,
      balance: 1,
      owner: accounts[0].address
    });
  }, 20000);
});
