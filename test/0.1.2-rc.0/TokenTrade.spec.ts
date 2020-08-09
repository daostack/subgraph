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
    console.log("Starting token trade test")
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
    console.log("Deploying send token")
    const sendedToken =
    await new web3.eth.Contract(DAOToken.abi, undefined, opts)
      .deploy({ data: DAOToken.bytecode,  arguments: []}).send();
    await sendedToken.methods.initialize('Test Token One', 'TSTF', '10000000000', accounts[1].address).send();
    await sendedToken.methods.mint(accounts[0].address, '1000000000').send({ from: accounts[1].address });
    
    console.log("Deploying receive token")
    const receivedToken =
    await new web3.eth.Contract(DAOToken.abi, undefined, opts)
      .deploy({ data: DAOToken.bytecode,  arguments: []}).send();
    await receivedToken.methods.initialize('Test Token Second', 'TSTS', '10000000000', accounts[1].address).send();
    await receivedToken.methods.mint(addresses.Avatar, '1000000000').send({ from: accounts[1].address });

    // Let's register the token trade scheme on the DAO
    console.log("Initializing token trade contract")
    
    const tokenTrade = new web3.eth.Contract(
      TokenTrade.abi,
      undefined,
      opts,
    );
    let initData = tokenTrade.methods.initialize(
        (await schemeFactory.methods.avatar().call()),
        (await schemeFactory.methods.votingMachine().call()),
        ["50", "1800", "600", "600", "2199023255552", "172", "300", "5000000000000000000", "1", "100000000000000000000", "0"],
        '0x0000000000000000000000000000000000000000',
        (await schemeFactory.methods.voteParamsHash().call()),
      ).encodeABI();

    let proposeTokenTradeRegistration = schemeFactory.methods.proposeScheme(
      getPackageVersion(),
      'TokenTrade',
      initData,
      '0x0000001f',
      "0x0000000000000000000000000000000000000000",
      "",
    );

    const registryProposalId = await proposeTokenTradeRegistration.call();
    console.log("Registry proposal ID: " + registryProposalId)
    await proposeTokenTradeRegistration.send();
    console.log("Registry proposal created!")
    console.log("Waiting for it to index")
    let proposalIsIndexed = async () => {
      return (await sendQuery(schemeFactoryNewSchemeProposalsQuery)).schemeFactoryNewSchemeProposals.length
        > prevProposalsLength;
    };

    await waitUntilTrue(proposalIsIndexed);
    console.log("Indeexed!")
  
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
      return (await sendQuery(getRegistryProposal)).proposal.executedAt != false
    };
    console.log("Waiting to be executed")
    await waitUntilTrue(executedIsIndexed);
    console.log("Executed!")

    const tokenTradeProposals = `{
      tokenTradeProposals {
        id
      }
    }`

    tokenTrade.options.address = tokenTradeAddress
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
      const { timestamp } = await web3.eth.getBlock(blockNumber);
      return timestamp;
    }

    async function redeem({ proposalId }) {
      const { blockNumber } = await tokenTrade.methods.execute(proposalId).send();
      const { timestamp } = await web3.eth.getBlock(blockNumber);
      return timestamp;
    }

    console.log(await sendQuery(tokenTradeProposals))
    prevProposalsLength = (
      await sendQuery(tokenTradeProposals)
    ).tokenTradeProposals.length

    console.log("Creating proposal in token trade scheme")


      const prop = tokenTrade.methods.proposeTokenTrade(
        sendTokenAddress,
        sendTokenAmount,
        receiveTokenAddress,
        receiveTokenAmount,
        "",
      );
      console.log("Previous to get ID");
      const proposalId = await prop.call({ from: accounts[0].address });
      console.log("Proposal ID " + proposalId);
      const tokenTradeProposalTx = await prop.send({ from: accounts[0].address });
      console.log("Proposal created");
      const { timestamp } = await web3.eth.getBlock(tokenTradeProposalTx.blockNumber);

    console.log("Proposal created")
    console.log("tx: ", tokenTradeProposalTx)

    proposalIsIndexed = async () => {
      return (await sendQuery(tokenTradeProposals)).tokenTradeProposals.length
      > prevProposalsLength;
    };
    console.log("wait until proposal is indexed")
    
    await waitUntilTrue(proposalIsIndexed);
    console.log("proposal indexed!!")

    const getProposal = `{
      proposal(id: "${proposalId}") {
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


    console.log("Let's get the proposal")
    let proposal = (await sendQuery(getProposal)).proposal;
    console.log("We have the proposal!")

    expect(proposal).toMatchObject({
      id: proposalId,
      descriptionHash: "",
      stage: 'Queued',
      createdAt: timestamp.toString(),
      executedAt: null,
      proposer: accounts[0].address.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),

      tokenTrade: {
        id: proposalId,
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

    console.log("First vote")
    await vote({
      proposalId: proposalId,
      outcome: PASS,
      voter: accounts[0].address,
    });
    
    console.log("Second vote")
    await vote({
      proposalId: proposalId,
      outcome: PASS,
      voter: accounts[1].address,
    });
    
    console.log("Third vote")
    await vote({
      proposalId: proposalId,
      outcome: PASS,
      voter: accounts[2].address,
    });
    
    console.log("Fourth vote")
    let executedAt = await vote({
      proposalId: proposalId,
      outcome: PASS,
      voter: accounts[3].address,
    });

    console.log("Wait until the execute is indexed")
    executedIsIndexed = async () => {
      return (await sendQuery(getProposal)).proposal.executedAt != false;
    };
    
    await waitUntilTrue(executedIsIndexed);
    console.log("Executeis indexed!")

    proposal = (await sendQuery(getProposal)).proposal;
    console.log("Let's ge tproposal executed")
    expect(proposal).toMatchObject({
      id: proposalId,
      descriptionHash: "",
      stage: 'Executed',
      createdAt: timestamp.toString(),
      executedAt: executedAt + '',
      proposer: web3.eth.defaultAccount.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),

      tokenTrade: {
        id: proposalId,
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

    console.log("Let's redeem")
    await redeem({ proposalId: proposalId });
    console.log("redeemed")
    console.log("Wait for indexation of redeem")
    const redeemIsIndexed = async () => {
      return (await sendQuery(getProposal)).proposal.reputationMinted != '0';
    };
    
    await waitUntilTrue(redeemIsIndexed);
    console.log("Redeem indexed")
    console.log("Let's check the proposal to make sure it updated")
    proposal = (await sendQuery(getProposal)).proposal;
    
    console.log("Proposal queried")
    expect(proposal).toMatchObject({
      id: proposalId,
      descriptionHash: "",
      stage: 'Executed',
      createdAt: timestamp.toString(),
      executedAt: executedAt + '',
      proposer: web3.eth.defaultAccount.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),

      tokenTrade: {
        id: proposalId,
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
    console.log("we are done!!")
  }, 300000);
});
