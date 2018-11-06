import { getWeb3, getContractAddresses, getOptions, query } from "./util";

const Reputation = require('@daostack/arc/build/contracts/Reputation.json');

describe('Reputation', () => {
  let web3, addresses, reputation;
  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    const opts = await getOptions(web3);
    reputation = new web3.eth.Contract(Reputation.abi, addresses.Reputation[0], opts);
  });

  async function checkTotalSupply(value) {
    const { reputationContracts } = await query(`{
      reputationContracts {
        address,
        totalSupply
      }
    }`);
    expect(reputationContracts.length).toEqual(1);
    expect(reputationContracts).toContainEqual({
      address: reputation.options.address.toLowerCase(),
      totalSupply: value
    })
  }

  it('Sanity', async () => {
    let reputationsResponse;
    const accounts = web3.eth.accounts.wallet;
    let txs = [];
    txs.push(await reputation.methods.mint(accounts[0].address, '100').send());

    await checkTotalSupply('100');
    txs.push(await reputation.methods.mint(accounts[1].address, '100').send());

    await checkTotalSupply('200');
    txs.push(await reputation.methods.burn(accounts[0].address, '30').send());
    await checkTotalSupply('170');

    txs.push(await reputation.methods.mint(accounts[2].address, '300').send());
    await checkTotalSupply('470');
    txs.push(await reputation.methods.burn(accounts[1].address, '100').send());
    await checkTotalSupply('370');
    txs.push(await reputation.methods.burn(accounts[2].address, '1').send());
    await checkTotalSupply('369');


    txs = txs.map(({ transactionHash }) => transactionHash);

    const { reputationHolders } = await query(`{
      reputationHolders {
        contract,
        address,
        balance
      }
    }`);

    expect(reputationHolders.length).toEqual(2);
    expect(reputationHolders).toContainEqual({
      contract: reputation.options.address.toLowerCase(),
      address: accounts[0].address.toLowerCase(),
      balance: '70'
    })
    expect(reputationHolders).toContainEqual({
      contract: reputation.options.address.toLowerCase(),
      address: accounts[2].address.toLowerCase(),
      balance: '299'
    })

    const { reputationMints } = await query(`{
      reputationMints {
        txHash,
        contract,
        address,
        amount
      }
    }`);

    expect(reputationMints.length).toEqual(3);
    expect(reputationMints).toContainEqual({
      txHash: txs[0],
      contract: reputation.options.address.toLowerCase(),
      address: accounts[0].address.toLowerCase(),
      amount: '100'
    });
    expect(reputationMints).toContainEqual({
      txHash: txs[1],
      contract: reputation.options.address.toLowerCase(),
      address: accounts[1].address.toLowerCase(),
      amount: '100'
    });
    expect(reputationMints).toContainEqual({
      txHash: txs[3],
      contract: reputation.options.address.toLowerCase(),
      address: accounts[2].address.toLowerCase(),
      amount: '300'
    });

    const { reputationBurns } = await query(`{
      reputationBurns {
        txHash,
        contract,
        address,
        amount
      }
    }`);

    expect(reputationBurns.length).toEqual(3);
    expect(reputationBurns).toContainEqual({
      txHash: txs[2],
      contract: reputation.options.address.toLowerCase(),
      address: accounts[0].address.toLowerCase(),
      amount: '30'
    });
    expect(reputationBurns).toContainEqual({
      txHash: txs[4],
      contract: reputation.options.address.toLowerCase(),
      address: accounts[1].address.toLowerCase(),
      amount: '100'
    });
    expect(reputationBurns).toContainEqual({
      txHash: txs[5],
      contract: reputation.options.address.toLowerCase(),
      address: accounts[2].address.toLowerCase(),
      amount: '1'
    });
  }, 100000)
})
