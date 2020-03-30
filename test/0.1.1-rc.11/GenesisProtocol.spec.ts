import {
  getContractAddresses,
  getOptions,
  getWeb3,
  increaseTime,
  nullAddress,
  prepareReputation,
  sendQuery,
  waitUntilTrue,
} from './util';

const ContributionReward = require('@daostack/migration-experimental/contracts/0.1.1-rc.11/ContributionReward.json');
const DAOToken = require('@daostack/migration-experimental/contracts/0.1.1-rc.11/DAOToken.json');
const GenesisProtocol = require('@daostack/migration-experimental/contracts/0.1.1-rc.11/GenesisProtocol.json');

describe('GenesisProtocol', () => {
  let web3;
  let addresses;
  let genesisProtocol;
  let daoToken;
  let opts;
  let accounts;
  let contributionReward;

  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);
    accounts = web3.eth.accounts.wallet;
    await prepareReputation(web3, addresses, opts, accounts);
    genesisProtocol = new web3.eth.Contract(
      GenesisProtocol.abi,
      addresses.GenesisProtocol,
      opts,
    );

    daoToken = new web3.eth.Contract(DAOToken.abi, addresses.GEN, opts);
    contributionReward = new web3.eth.Contract(ContributionReward.abi, addresses.ContributionReward, opts);
  }, 100000);

  it('Sanity', async () => {
    await daoToken.methods.mint(accounts[0].address,  web3.utils.toWei('1000')).send();
    await daoToken.methods.mint(accounts[1].address,  web3.utils.toWei('1000')).send();
    await daoToken.methods.approve(genesisProtocol.options.address,  web3.utils.toWei('1000')).send();
    const propose = await contributionReward.methods.proposeContributionReward(
      '0x0000000000000000000000000000000000000000000000000000000000000123',
      0,
      [0, 0, 0, 0, 1],
      addresses.GEN,
      accounts[1].address,
    );
    const proposalId = await propose.call();

    const txs = [];

    txs.push(await propose.send());
    // boost the proposal
    txs.push(
      await genesisProtocol.methods.stake(proposalId, 1 /* YES */,  web3.utils.toWei('200')).send(),
    );

    txs.push(
      await genesisProtocol.methods
        .stake(proposalId, 1 /* YES */,  web3.utils.toWei('800'))
        .send(),
    );
    // wait for proposal it pass
    await increaseTime(300000, web3);
    await genesisProtocol.methods.execute(proposalId).send();
    // vote for it to pass
    await genesisProtocol.methods.vote(proposalId, 1, 0, accounts[0].address).send({ from: accounts[0].address });
    await genesisProtocol.methods.vote(proposalId, 1, 0, accounts[1].address).send({ from: accounts[1].address });

    await increaseTime(601, web3);
    txs.push(await genesisProtocol.methods.execute(proposalId).send());
    txs.push(
      await genesisProtocol.methods
        .redeem(proposalId, accounts[0].address)
        .send(),
    );

    const { genesisProtocolProposals } = await sendQuery(`{
      genesisProtocolProposals {
        proposalId
        submittedTime
        proposer
        daoAvatarAddress
        numOfChoices
        decision
        executionTime
        totalReputation
        executionState
        state
      }
    }`, 2000);

    expect(genesisProtocolProposals).toContainEqual({
      proposalId,
      submittedTime: (await web3.eth.getBlock(
        txs[0].blockNumber,
      )).timestamp.toString(),
      proposer: accounts[0].address.toLowerCase(),
      daoAvatarAddress: addresses.Avatar.toLowerCase(),
      numOfChoices: '2',
      state: 2 /* Executed */,
      decision: '1' /* YES */,
      executionState: 4, // enum ExecutionState
     // { None, QueueBarCrossed, QueueTimeOut, PreBoostedBarCrossed, BoostedTimeOut, BoostedBarCrossed}
      executionTime: (await web3.eth.getBlock(
        txs[3].blockNumber,
      )).timestamp.toString(),
      totalReputation:
        txs[3].events.ExecuteProposal.returnValues._totalReputation,
    });

    const { genesisProtocolExecuteProposals } = await sendQuery(`{
      genesisProtocolExecuteProposals {
        proposalId
        decision
        organization
        totalReputation
      }
    }`);

    expect(genesisProtocolExecuteProposals).toContainEqual({
      proposalId,
      decision: '1' /* YES */,
      organization: addresses.Avatar.toLowerCase(),
      totalReputation:
        txs[3].events.ExecuteProposal.returnValues._totalReputation,
    });

    const { genesisProtocolGPExecuteProposals } = await sendQuery(`{
      genesisProtocolGPExecuteProposals {
        proposalId
        executionState
      }
    }`);

    expect(genesisProtocolGPExecuteProposals).toContainEqual({
      proposalId,
      executionState: 4, //    enum ExecutionState
      //     { None, PreBoostedTimeOut, PreBoostedBarCrossed, BoostedTimeOut,BoostedBarCrossed }
    });
  }, 15000);
});
