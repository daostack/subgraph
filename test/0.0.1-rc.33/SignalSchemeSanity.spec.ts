import {
  getArcVersion,
  getContractAddresses,
  getOptions,
  getWeb3,
  sendQuery,
  writeProposalIPFS,
} from './util';

jest.setTimeout(30000);

const DaoCreator = require('@daostack/migration/contracts/' + getArcVersion() + '/DaoCreator.json');
const Avatar = require('@daostack/migration/contracts/' + getArcVersion() + '/Avatar.json');
const GenesisProtocol = require('@daostack/migration/contracts/' + getArcVersion() + '/GenesisProtocol.json');
const GenericScheme = require('@daostack/migration/contracts/' + getArcVersion() + '/GenericScheme.json');

/**
 * Address and ABI of the SignalScheme Contract.
 * Currently SignalScheme is deployed manually and address is added here.
 * The Signal Scheme address should also be added/updated
 * in ops/mappings.json (required for subgraph tracking).
 *
 * NOTE: This manual deployment should be done before the subgraph deployment.
 *
 * Technically this "Scheme" should be part of the arc and migrations package
 * and these values should be derived from there.
 */
const SignalScheme = require('./SignalSchemeABI.json');
const SignalSchemeAddress = '0x383A20B3635a10a4da8f733E8eA256cBcAcB4D4E';

describe('Generic Signal Scheme', () => {
  let web3;
  let avatar;
  let genesisProtocol;
  let signalScheme;
  let genericScheme;

  beforeAll(async () => {
    web3 = await getWeb3();
    const addresses = getContractAddresses();
    const opts = await getOptions(web3);
    const daoCreator = new web3.eth.Contract(DaoCreator.abi, addresses.DaoCreator, opts);
    genesisProtocol = await new web3.eth.Contract(GenesisProtocol.abi, addresses.GenesisProtocol, opts);
    const accounts = web3.eth.accounts.wallet;

    const gpParams = {
      queuedVoteRequiredPercentage: 50,
      queuedVotePeriodLimit: 60,
      boostedVotePeriodLimit: 5,
      preBoostedVotePeriodLimit: 0,
      thresholdConst: 2000,
      quietEndingPeriod: 0,
      proposingRepReward: 60,
      votersReputationLossRatio: 10,
      minimumDaoBounty: 15,
      daoBountyConst: 10,
      activationTime: 0,
      voteOnBehalf: '0x0000000000000000000000000000000000000000',
    };
    const vmSetParams = genesisProtocol.methods.setParameters(
      [
        gpParams.queuedVoteRequiredPercentage,
        gpParams.queuedVotePeriodLimit,
        gpParams.boostedVotePeriodLimit,
        gpParams.preBoostedVotePeriodLimit,
        gpParams.thresholdConst,
        gpParams.quietEndingPeriod,
        gpParams.proposingRepReward,
        gpParams.votersReputationLossRatio,
        gpParams.minimumDaoBounty,
        gpParams.daoBountyConst,
        gpParams.activationTime,
      ],
      gpParams.voteOnBehalf,
    );
    const vmParamsHash = await vmSetParams.call();
    await vmSetParams.send();

    const tx = await daoCreator.methods.forgeOrg(
      'Test DAO',
      'Test Token',
      'TST',
      [accounts[0].address, accounts[1].address, accounts[2].address, accounts[3].address],
      [1000, 1000, 1000, 1000],
      [2000, 2000, 2000, 2000],
      '0x0000000000000000000000000000000000000000',
      0,
    ).send();

    const avatarAddress = tx.events.NewOrg.returnValues._avatar;
    avatar = await new web3.eth.Contract(Avatar.abi, avatarAddress, opts);

    signalScheme = new web3.eth.Contract(
      SignalScheme.abi,
      SignalSchemeAddress,
      opts,
    );

    genericScheme = await new web3.eth.Contract(
      GenericScheme.abi,
      undefined,
      opts,
    ).deploy({
      data: GenericScheme.bytecode,
      arguments: [],
    }).send();

    await daoCreator.methods.setSchemes(
      avatar.options.address,
      [genericScheme.options.address],
      [vmParamsHash],
      ['0x00000010'],
      '',
    ).send();

    await genericScheme.methods.initialize(
      avatar.options.address,
      genesisProtocol.options.address,
      vmParamsHash,
      SignalSchemeAddress,
    ).send();

  });

  it('Insert Signal Data', async () => {

    let proposalIPFSData = {
      description: 'Setting new header Image',
      title: 'New Header Image',
      url: 'https://w.wallhaven.cc/full/13/wallhaven-13mk9v.jpg',
      key: 'Header',
      value: 'https://w.wallhaven.cc/full/13/wallhaven-13mk9v.jpg',
    };

    let matchto = {
      signal:
      {
        data:
          '{"Header":"https://w.wallhaven.cc/full/13/wallhaven-13mk9v.jpg"}',
        id: avatar.options.address.toLowerCase(),
      },
    };

    await mainTest(web3, avatar, genericScheme, genesisProtocol, signalScheme, proposalIPFSData, matchto);

  }, 100000);

  it('Update Signal Data', async () => {

    let proposalIPFSData = {
      description: 'Update new header Image',
      title: 'New Header Image',
      url: 'https://w.wallhaven.cc/full/14/wallhaven-13mk9v.jpg',
      key: 'Header',
      value: 'https://w.wallhaven.cc/full/14/wallhaven-13mk9v.jpg',
    };

    let matchto = {
      signal:
      {
        data:
          '{"Header":"https://w.wallhaven.cc/full/14/wallhaven-13mk9v.jpg"}',
        id: avatar.options.address.toLowerCase(),
      },
    };

    await mainTest(web3, avatar, genericScheme, genesisProtocol, signalScheme, proposalIPFSData, matchto);

  }, 100000);

  it('Remove Signal Data', async () => {

    let proposalIPFSData = {
      description: 'Remove header Image',
      title: 'Remove Header Image',
      url: '',
      key: 'Header',
      value: '',
    };

    let matchto = {
      signal:
      {
        data:
          '{"Header":""}',
        id: avatar.options.address.toLowerCase(),
      },
    };

    await mainTest(web3, avatar, genericScheme, genesisProtocol, signalScheme, proposalIPFSData, matchto);

  }, 100000);

});

const mainTest = async (web3, avatar, genericScheme, genesisProtocol, signalScheme, proposalIPFSData, matchto) => {
  const accounts = web3.eth.accounts.wallet;

  const descHash = await writeProposalIPFS(proposalIPFSData);
  const callData = await signalScheme.methods.signal(descHash).encodeABI();

  async function propose() {
    const prop = genericScheme.methods.proposeCall(callData, 0, descHash);
    const proposalId = await prop.call();
    const { blockNumber } = await prop.send();
    const { timestamp } = await web3.eth.getBlock(blockNumber);
    return { proposalId, timestamp };
  }

  const [PASS, FAIL] = [1, 2];
  async function vote({ proposalId, outcome, voter, amount = 0 }) {
    const { blockNumber } = await genesisProtocol.methods.vote(proposalId, outcome, amount, voter)
      .send({ from: voter, gas: 5000000 });
    const { timestamp } = await web3.eth.getBlock(blockNumber);
    return timestamp;
  }

  const { proposalId: p1 } = await propose();

  await vote({
    proposalId: p1,
    outcome: PASS,
    amount: 0,
    voter: accounts[0].address,
  });

  await vote({
    proposalId: p1,
    outcome: PASS,
    amount: 0,
    voter: accounts[1].address,
  });

  await vote({
    proposalId: p1,
    outcome: PASS,
    amount: 0,
    voter: accounts[2].address,
  });

  const metaq = `{
      signal(id: "${avatar.options.address.toLowerCase()}"){
        id
        data
      }
    }`;

  const metadata = await sendQuery(metaq, 5000);
  expect(metadata).toMatchObject(matchto);

};
