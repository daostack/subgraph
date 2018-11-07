import { getWeb3, getContractAddresses, getOptions, query, nullParamsHash, padZeros, hashLength } from "./util";

const DAOToken = require('@daostack/arc/build/contracts/DAOToken.json');


describe('DAOToken', () => {
  let web3, addresses, daotoken, opts;
  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);
    daotoken = new web3.eth.Contract(DAOToken.abi, addresses.DAOToken, opts);
  });

  it('Sanity', async () => {
    const accounts = web3.eth.accounts.wallet;
    let txs = []

    txs.push(await daotoken.methods.mint(accounts[0].address, '100').send());
    txs.push(await daotoken.methods.mint(accounts[1].address, '100').send());
    txs.push(await daotoken.methods.mint(accounts[1].address, '100').send());
    txs.push(await daotoken.methods.mint(accounts[2].address, '100').send());
    txs.push(await daotoken.methods.burn('1').send());
    txs.push(await daotoken.methods.burn('1').send());
    txs.push(await daotoken.methods.transfer(accounts[3].address, '50').send());
    txs.push(await daotoken.methods.approve(accounts[3].address, '50').send());
    txs.push(await daotoken.methods.transferOwnership(accounts[1].address).send());

    txs = txs.map(({ transactionHash }) => transactionHash);

    const { tokenContracts } = await query(`{
      tokenContracts {
        address
        totalSupply
        owner
      }
    }`);

    expect(tokenContracts.length).toEqual(1)
    expect(tokenContracts).toContainEqual({
      address: daotoken.options.address.toLowerCase(),
      totalSupply: '398',
      owner: accounts[1].address.toLowerCase(),
    })

    const { tokenHolders } = await query(`{
      tokenHolders {
        contract
        address
        balance
      }
    }`);

    expect(tokenHolders.length).toEqual(4)
    expect(tokenHolders).toContainEqual({
      contract: daotoken.options.address.toLowerCase(),
      address: accounts[0].address.toLowerCase(),
      balance: '48',
    })

    const { tokenTransfers } = await query(`{
      tokenTransfers {
        txHash
        contract
        from
        to
        value
      }
    }`);

    expect(tokenTransfers.length).toEqual(7)
    expect(tokenTransfers).toContainEqual({
      txHash: txs[6],
      contract: daotoken.options.address.toLowerCase(),
      from: accounts[0].address.toLowerCase(),
      to: accounts[3].address.toLowerCase(),
      value: '50',
    })

  }, 20000)
})
