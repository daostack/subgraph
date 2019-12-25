import { getContractAddresses, getOptions, getWeb3, prepareReputation, sendQuery, waitUntilTrue } from './util';

const Controller = require('@daostack/migration-experimental/contracts/0.1.1-rc.1/Controller.json');
const Reputation = require('@daostack/migration-experimental/contracts/0.1.1-rc.1/Reputation.json');

describe('Reputation', () => {
  let web3;
  let addresses;
  let reputation;
  let opts;
  let accounts;

  const totalSupplyIsIndexed = async () => {
    return (await sendQuery(`
    {
      reputationContracts(where: {address: "${reputation.options.address}"}) {
        address,
        totalSupply
      }
    }`)).reputationContracts[0].totalSupply === (await reputation.methods.totalSupply().call());
  };

  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);
    accounts = web3.eth.accounts.wallet;
    reputation = new web3.eth.Contract(Reputation.abi, addresses.NativeReputation, opts);
    await prepareReputation(web3, addresses, opts, accounts);
  }, 100000);

  async function checkTotalSupply() {
    await waitUntilTrue(totalSupplyIsIndexed);

    const { reputationContracts } = await sendQuery(`{
      reputationContracts(where: {address: "${reputation.options.address}"}) {
        address,
        totalSupply
      }
    }`);
    expect(reputationContracts).toContainEqual({
      address: reputation.options.address.toLowerCase(),
      totalSupply: await reputation.methods.totalSupply().call(),
    });
  }

  it('Sanity', async () => {
    const controller = new web3.eth.Contract(Controller.abi, addresses.Controller, opts);

    let txs = [];

    txs.push(await controller.methods.mintReputation(web3.utils.toWei('100') , accounts[1].address).send());
    await checkTotalSupply();

    txs.push(await controller.methods.burnReputation(web3.utils.toWei('30'), accounts[0].address).send());
    await checkTotalSupply();

    txs.push(await controller.methods.mintReputation(web3.utils.toWei('300'), accounts[2].address).send());
    await checkTotalSupply();

    txs.push(await controller.methods.burnReputation(web3.utils.toWei('100') , accounts[1].address).send());
    await checkTotalSupply();

    txs.push(await controller.methods.burnReputation(web3.utils.toWei('1'), accounts[2].address).send());
    await checkTotalSupply();

    txs = txs.map(({ transactionHash }) => transactionHash);

    const { reputationHolders } = await sendQuery(`{
      reputationHolders {
        contract,
        address,
        balance
      }
    }`);

    expect(reputationHolders.length).toBeGreaterThanOrEqual(2);

    expect(reputationHolders).toContainEqual({
      contract: reputation.options.address.toLowerCase(),
      address: accounts[0].address.toLowerCase(),
      balance: await reputation.methods.balanceOf(accounts[0].address).call(),
    });

    expect(reputationHolders).toContainEqual({
      contract: reputation.options.address.toLowerCase(),
      address: accounts[2].address.toLowerCase(),
      balance: await reputation.methods.balanceOf(accounts[2].address).call(),
    });

    const { reputationMints } = await sendQuery(`{
      reputationMints {
        txHash,
        contract,
        address,
        amount
      }
    }`);

    expect(reputationMints.length).toBeGreaterThanOrEqual(3);
    expect(reputationMints).toContainEqual({
      txHash: txs[0],
      contract: reputation.options.address.toLowerCase(),
      address: accounts[1].address.toLowerCase(),
      amount: web3.utils.toWei('100'),
    });

    expect(reputationMints).toContainEqual({
      txHash: txs[2],
      contract: reputation.options.address.toLowerCase(),
      address: accounts[2].address.toLowerCase(),
      amount: web3.utils.toWei('300'),
    });

    const { reputationBurns } = await sendQuery(`{
      reputationBurns {
        txHash,
        contract,
        address,
        amount
      }
    }`);

    expect(reputationBurns.length).toBeGreaterThanOrEqual(3);
    expect(reputationBurns).toContainEqual({
      txHash: txs[1],
      contract: reputation.options.address.toLowerCase(),
      address: accounts[0].address.toLowerCase(),
      amount: web3.utils.toWei('30'),
    });

    expect(reputationBurns).toContainEqual({
      txHash: txs[3],
      contract: reputation.options.address.toLowerCase(),
      address: accounts[1].address.toLowerCase(),
      amount: web3.utils.toWei('100'),
    });

    expect(reputationBurns).toContainEqual({
      txHash: txs[4],
      contract: reputation.options.address.toLowerCase(),
      address: accounts[2].address.toLowerCase(),
      amount: web3.utils.toWei('1'),
    });
  }, 100000);
});
