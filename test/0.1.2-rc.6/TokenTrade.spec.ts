import {
  getArcVersion,
  getContractAddresses,
  getOptions,
  getPackageVersion,
  getWeb3,
  prepareReputation,
  sendQuery,
  waitUntilTrue,
} from './util';

const DAOToken = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/DAOToken.json');
const GenesisProtocol = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/GenesisProtocol.json');
const TokenTrade = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/TokenTrade.json');
const SchemeFactory = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/SchemeFactory.json');
const DAOFactory = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/DAOFactory.json');

describe('TokenTrade Plugin', () => {
  let web3;
  let addresses;
  let opts;
  let accounts;
  let schemeFactory;

  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);
    accounts = web3.eth.accounts.wallet;
    await prepareReputation(web3, addresses, opts, accounts);
    schemeFactory = new web3.eth.Contract(SchemeFactory.abi, addresses.SchemeFactory, opts);
  }, 100000);

  it('TokenTrade proposal', async () => {
    const genesisProtocol = new web3.eth.Contract(
      GenesisProtocol.abi,
      addresses.GenesisProtocol,
      opts,
    );

    const descHash = '0x0000000000000000000000000000000000000000000000000000000000000123';
    let daoFactory = new web3.eth.Contract(DAOFactory.abi, addresses.DAOFactoryInstance, opts);

    const schemeFactoryNewSchemeProposalsQuery = `{
      schemeFactoryNewSchemeProposals {
        txHash
        contract
        avatar
        descriptionHash
        votingMachine
        proposalId
        schemeName
        schemeData
        packageVersion
        permission
        schemeToReplace
      }
    }`;

    let prevProposalsLength = (
      await sendQuery(schemeFactoryNewSchemeProposalsQuery)
    ).schemeFactoryNewSchemeProposals.length;

    // Create the ERC20 to receive and send
    const sendedToken =
    await new web3.eth.Contract(DAOToken.abi, undefined, opts)
      .deploy({ data: DAOToken.bytecode,  arguments: []}).send();
    await sendedToken.methods.initialize('Test Token One', 'TSTF', '10000000000', accounts[1].address).send();
    await sendedToken.methods.mint(accounts[0].address, '1000000000').send({ from: accounts[1].address });

    const receivedToken =
    await new web3.eth.Contract(DAOToken.abi, undefined, opts)
      .deploy({ data: DAOToken.bytecode,  arguments: []}).send();
    await receivedToken.methods.initialize('Test Token Second', 'TSTS', '10000000000', accounts[1].address).send();
    await receivedToken.methods.mint(addresses.Avatar, '1000000000').send({ from: accounts[1].address });

    // Let's register the token trade scheme on the DAO

    const tokenTrade = new web3.eth.Contract(
      TokenTrade.abi,
      undefined,
      opts,
    );
    let initData = tokenTrade.methods.initialize(
        (await schemeFactory.methods.avatar().call()),
        (await schemeFactory.methods.votingMachine().call()),
        ['50', '1800', '600', '600', '2199023255552', '172', '300', '5000000000000000000', '1', '100000000000000000000', '0'],
        '0x0000000000000000000000000000000000000000',
        (await schemeFactory.methods.voteParamsHash().call()),
      ).encodeABI();

    let proposeTokenTradeRegistration = schemeFactory.methods.proposeScheme(
      getPackageVersion(),
      'TokenTrade',
      initData,
      '0x0000001f',
      '0x0000000000000000000000000000000000000000',
      '',
    );

    const registryProposalId = await proposeTokenTradeRegistration.call();
    await proposeTokenTradeRegistration.send();
    let proposalIsIndexed = async () => {
      return (await sendQuery(schemeFactoryNewSchemeProposalsQuery)).schemeFactoryNewSchemeProposals.length
        > prevProposalsLength;
    };

    await waitUntilTrue(proposalIsIndexed);

    let i = 0;
    let tx;
    let tokenTradeAddress;
    while ((await genesisProtocol.methods.proposals(registryProposalId).call()).state !== '2') {
      tx = (await genesisProtocol.methods.vote(
        registryProposalId,
        1,
        0,
        accounts[i].address)
        .send({ from: accounts[i].address }));
      i++;

      if ((await genesisProtocol.methods.proposals(registryProposalId).call()).state === '2') {
        let proxyEvents = await daoFactory.getPastEvents(
          'ProxyCreated',
          {
            fromBlock: tx.blockNumber,
            toBlock: tx.blockNumber,
          },
        );
        tokenTradeAddress = proxyEvents[0].returnValues._proxy;
      }
    }

    const getRegistryProposal = `{
      proposal(id: "${registryProposalId}") {
          id
          descriptionHash
          stage
          createdAt
          executedAt
          proposer
          votingMachine
      }
    }`;

    let executedIsIndexed = async () => {
      return (await sendQuery(getRegistryProposal)).proposal.executedAt != false;
    };
    await waitUntilTrue(executedIsIndexed);

    const tokenTradeProposals = `{
      tokenTradeProposals {
        id
      }
    }`;

    tokenTrade.options.address = tokenTradeAddress;
    await sendedToken.methods.approve(tokenTradeAddress, '1000000000').send({ from: accounts[0].address });

    // Now we create proposals on our scheme
    const receiveTokenAddress = receivedToken.options.address;
    const sendTokenAddress = sendedToken.options.address;
    const sendTokenAmount = 10;
    const receiveTokenAmount = 1;

    const [PASS, FAIL] = [1, 2];
    async function vote({ proposalId, outcome, voter, amount = 0 }) {
      const { blockNumber } = await genesisProtocol.methods
        .vote(proposalId, outcome, amount, voter)
        .send({ from: voter });
      const { timestamp: voteTime } = await web3.eth.getBlock(blockNumber);
      return voteTime;
    }

    async function redeem({ proposalId }) {
      const { blockNumber } = await tokenTrade.methods.execute(proposalId).send();
      const { timestamp: redeemTime } = await web3.eth.getBlock(blockNumber);
      return redeemTime;
    }

    prevProposalsLength = (
      await sendQuery(tokenTradeProposals)
    ).tokenTradeProposals.length;

    const prop = tokenTrade.methods.proposeTokenTrade(
        sendTokenAddress,
        sendTokenAmount,
        receiveTokenAddress,
        receiveTokenAmount,
        '',
      );
    const tokenTradeProposalId = await prop.call({ from: accounts[0].address });
    const tokenTradeProposalTx = await prop.send({ from: accounts[0].address });
    const { timestamp } = await web3.eth.getBlock(tokenTradeProposalTx.blockNumber);

    proposalIsIndexed = async () => {
      return (await sendQuery(tokenTradeProposals)).tokenTradeProposals.length
      > prevProposalsLength;
    };

    await waitUntilTrue(proposalIsIndexed);

    const getProposal = `{
      proposal(id: "${tokenTradeProposalId}") {
        id
        descriptionHash
        stage
        createdAt
        executedAt
        proposer
        votingMachine

        tokenTrade {
          id
          dao {
            id
          }
          beneficiary
          sendTokenAddress
          sendTokenAmount
          receiveTokenAddress
          receiveTokenAmount
          executed
          redeemed
        }
      }
    }`;

    let proposal = (await sendQuery(getProposal)).proposal;

    expect(proposal).toMatchObject({
      id: tokenTradeProposalId,
      descriptionHash: '',
      stage: 'Queued',
      createdAt: timestamp.toString(),
      executedAt: null,
      proposer: accounts[0].address.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),

      tokenTrade: {
        id: tokenTradeProposalId,
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        beneficiary: accounts[0].address.toLowerCase(),
        sendTokenAddress: sendTokenAddress.toLowerCase(),
        sendTokenAmount: sendTokenAmount.toString(),
        receiveTokenAddress: receiveTokenAddress.toLowerCase(),
        receiveTokenAmount: receiveTokenAmount.toString(),
        executed: false,
        redeemed: false,
      },
    });

    await vote({
      proposalId: tokenTradeProposalId,
      outcome: PASS,
      voter: accounts[0].address,
    });

    await vote({
      proposalId: tokenTradeProposalId,
      outcome: PASS,
      voter: accounts[1].address,
    });

    await vote({
      proposalId: tokenTradeProposalId,
      outcome: PASS,
      voter: accounts[2].address,
    });

    let executedAt = await vote({
      proposalId: tokenTradeProposalId,
      outcome: PASS,
      voter: accounts[3].address,
    });

    executedIsIndexed = async () => {
      return (await sendQuery(getProposal)).proposal.tokenTrade.executed == true;
    };

    await waitUntilTrue(executedIsIndexed);

    proposal = (await sendQuery(getProposal)).proposal;
    expect(proposal).toMatchObject({
      id: tokenTradeProposalId,
      descriptionHash: '',
      stage: 'Executed',
      createdAt: timestamp.toString(),
      executedAt: executedAt + '',
      proposer: web3.eth.defaultAccount.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),

      tokenTrade: {
        id: tokenTradeProposalId,
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        beneficiary: accounts[0].address.toLowerCase(),
        sendTokenAddress: sendTokenAddress.toLowerCase(),
        sendTokenAmount: sendTokenAmount.toString(),
        receiveTokenAddress: receiveTokenAddress.toLowerCase(),
        receiveTokenAmount: receiveTokenAmount.toString(),
        executed: true,
        redeemed: false,
      },
    });

    await redeem({ proposalId: tokenTradeProposalId });

    const redeemIsIndexed = async () => {
      return (await sendQuery(getProposal)).proposal.tokenTrade.redeemed == true;
    };

    await waitUntilTrue(redeemIsIndexed);

    proposal = (await sendQuery(getProposal)).proposal;

    expect(proposal).toMatchObject({
      id: tokenTradeProposalId,
      descriptionHash: '',
      stage: 'Executed',
      createdAt: timestamp.toString(),
      executedAt: executedAt + '',
      proposer: web3.eth.defaultAccount.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),

      tokenTrade: {
        id: tokenTradeProposalId,
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        beneficiary: accounts[0].address.toLowerCase(),
        sendTokenAddress: sendTokenAddress.toLowerCase(),
        sendTokenAmount: sendTokenAmount.toString(),
        receiveTokenAddress: receiveTokenAddress.toLowerCase(),
        receiveTokenAmount: receiveTokenAmount.toString(),
        executed: true,
        redeemed: true,
      },
    });
  }, 200000);
});
