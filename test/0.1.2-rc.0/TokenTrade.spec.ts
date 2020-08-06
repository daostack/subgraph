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

    let prevProposalsLength;
    let prevExecutedsLength;
    let proposalIsIndexed;
    let executedIsIndexed;

    prevProposalsLength = (
      await sendQuery(schemeFactoryNewSchemeProposalsQuery)
    ).schemeFactoryNewSchemeProposals.length;

    const getSchemeFactoryProposalExecuteds = `{
      schemeFactoryProposalExecuteds {
        txHash,
        contract,
        avatar,
        proposalId,
        decision
      }
    }`;

    // Create the ERC20 to receive and send
    console.log("Deploying send token")
    const sendedToken =
    await new web3.eth.Contract(DAOToken.abi, undefined, opts)
    .deploy({ data: DAOToken.bytecode,  arguments: []}).send();
    await sendedToken.methods.initialize('Test Token One', 'TSTF', '10000000000', accounts[1].address).send();
    await sendedToken.methods.mint(accounts[0].address, '1000000000').send({ from: accounts[1].address });
    await sendedToken.methods.approve(addresses.TokenTrade, '1000000000').send({ from: accounts[0].address });
    
    console.log("Deploying receive token")
    const receivedToken =
    await new web3.eth.Contract(DAOToken.abi, undefined, opts)
    .deploy({ data: DAOToken.bytecode,  arguments: []}).send();
    await receivedToken.methods.initialize('Test Token Second', 'TSTS', '10000000000', accounts[1].address).send();
    await receivedToken.methods.mint(addresses.Avatar, '1000000000').send({ from: accounts[1].address });
    
    // console.log("Sending ETH to the DAO")
    // await web3.eth.sendTransaction({
    //       from: accounts[1].address,
    //       to: addresses.Avatar,
    //       value: 10,
    //       gas: 2000000,
    //       data: '0x',
    //   });

    // Let's register the token trade scheme on the DAO
    const tokenTrade = new web3.eth.Contract(
      TokenTrade.abi,
      addresses.TokenTrade,
      opts,
    );

    console.log("Initializing token trade contract")
    let initData = tokenTrade
      .methods
      .initialize(
        (await schemeFactory.methods.avatar().call()),
        (await schemeFactory.methods.votingMachine().call()),
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        '0x0000000000000000000000000000000000000000',
        (await schemeFactory.methods.voteParamsHash().call()),
      ).encodeABI();

    let proposeTokenTradeRegistration = schemeFactory.methods.proposeScheme(
        getPackageVersion(),
        'TokenTrade',
        initData,
        '0x0000001f',
        '0x0000000000000000000000000000000000000000',
        descHash,
      );

    const registryProposalId = await proposeTokenTradeRegistration.call();
    console.log("Registry proposal ID: " + registryProposalId)
    await proposeTokenTradeRegistration.send();
    console.log("Registry proposal created!")
    console.log("Waiting for it to index")
    proposalIsIndexed = async () => {
        return (await sendQuery(schemeFactoryNewSchemeProposalsQuery)).schemeFactoryNewSchemeProposals.length
         > prevProposalsLength;
      };

    await waitUntilTrue(proposalIsIndexed);
    console.log("Indeexed!")

    prevExecutedsLength = (
        await sendQuery(getSchemeFactoryProposalExecuteds)
      ).schemeFactoryProposalExecuteds.length;

      let k = 0;
      console.log("Let's vode")
      while ((await genesisProtocol.methods.proposals(registryProposalId).call()).state !== '2') {
        console.log("Vote number: " + k)
        await genesisProtocol.methods.vote(
          registryProposalId,
          1,
          0,
          accounts[k].address,
          ).send({ from: accounts[k].address });
          k++;
        }
        
        
    // executedIsIndexed = async () => {
    //     return (await sendQuery(getSchemeFactoryProposalExecuteds)).schemeFactoryProposalExecuteds.length
    //       > prevExecutedsLength;
    //   };
    //   console.log("Waiting to be executed")
    //   await waitUntilTrue(executedIsIndexed);
      console.log("Executed!")

    // Now we create proposals on our scheme
    const receiveTokenAddress = receivedToken.options.address;
    const sendTokenAddress = sendedToken.options.address;
    const sendTokenAmount = 1;
    const receiveTokenAmount = 1;
    async function propose({ from }) {
      const prop = tokenTrade.methods.proposeTokenTrade(
        sendTokenAddress,
        sendTokenAmount,
        receiveTokenAddress,
        receiveTokenAmount,
        descHash,
      );
      const proposalId = await prop.call({ from });
      const { blockNumber } = await prop.send({ from });
      const { timestamp } = await web3.eth.getBlock(blockNumber);
      return { proposalId, timestamp };
    }

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

    console.log("Creating proposal in token trade scheme")
    const { proposalId: p1, timestamp: p1Creation } = await propose({ from : accounts[1].address.toLowerCase() });
    console.log("Proposal created")
    const getProposal = `{
      proposal(id: "${p1}") {
        id
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
      id: p1,
      descriptionHash: descHash,
      stage: 'Queued',
      createdAt: p1Creation.toString(),
      executedAt: null,
      proposer: accounts[1].address.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),

      tokenTrade: {
        id: p1,
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        beneficiary: accounts[1].address.toLowerCase(),
        sendTokenAddress,
        sendTokenAmount,
        receiveTokenAddress,
        receiveTokenAmount,
        executed: false,
        redeemed: false,
      },
    });

    console.log("First vote")
    await vote({
      proposalId: p1,
      outcome: PASS,
      voter: accounts[0].address,
    });
    
    console.log("Second vote")
    await vote({
      proposalId: p1,
      outcome: PASS,
      voter: accounts[1].address,
    });
    
    console.log("Third vote")
    await vote({
      proposalId: p1,
      outcome: PASS,
      voter: accounts[2].address,
    });
    
    console.log("Fourth vote")
    let executedAt = await vote({
      proposalId: p1,
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
      id: p1,
      descriptionHash: descHash,
      stage: 'Executed',
      createdAt: p1Creation.toString(),
      executedAt: executedAt + '',
      proposer: web3.eth.defaultAccount.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),

      tokenTrade: {
        id: p1,
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        beneficiary: accounts[1].address.toLowerCase(),
        sendTokenAddress,
        sendTokenAmount,
        receiveTokenAddress,
        receiveTokenAmount,
        executed: true,
        redeemed: false,
      },
    });

    console.log("Let's redeem")
    await redeem({ proposalId: p1 });
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
      id: p1,
      descriptionHash: descHash,
      stage: 'Executed',
      createdAt: p1Creation.toString(),
      executedAt: executedAt + '',
      proposer: web3.eth.defaultAccount.toLowerCase(),
      votingMachine: genesisProtocol.options.address.toLowerCase(),

      tokenTrade: {
        id: p1,
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        beneficiary: accounts[1].address.toLowerCase(),
        sendTokenAddress,
        sendTokenAmount,
        receiveTokenAddress,
        receiveTokenAmount,
        executed: true,
        redeemed: true,
      },
    });
    console.log("we are done!!")
  }, 100000);
});
