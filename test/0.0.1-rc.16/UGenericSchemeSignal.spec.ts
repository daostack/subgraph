import {
  getContractAddresses,
  getOptions,
  getWeb3,
  sendQuery,
  waitUntilTrue,
  writeProposalIPFS,
} from './util';

const ActionMock = require('@daostack/arc/build/contracts/ActionMock.json');
const GenericScheme = require('@daostack/arc/build/contracts/UGenericScheme.json');
const GenesisProtocol = require('@daostack/arc/build/contracts/GenesisProtocol.json');

describe('UGeneric Signal Scheme', () => {
  let web3;
  let addresses;
  let opts;

  beforeAll(async () => {
    web3 = await getWeb3();
    addresses = getContractAddresses();
    opts = await getOptions(web3);
  });

  it('generic scheme proposal', async () => {
    const accounts = web3.eth.accounts.wallet;

    const genericScheme = new web3.eth.Contract(
      GenericScheme.abi,
      addresses.GenericScheme,
      opts,
    );
    const genesisProtocol = new web3.eth.Contract(
      GenesisProtocol.abi,
      addresses.GenesisProtocol,
      opts,
    );

    const actionMock = new web3.eth.Contract(
      ActionMock.abi,
      addresses.ActionMock,
      opts,
    );

    let proposalIPFSData = {
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\nWhat is Lorem Ipsum?\nFrom its medieval origins to the digital era, learn everything there is to know about the ubiquitous lorem ipsum passage.\n\nLorem ipsum used in a magazine layout\nMAGAZINE LAYOUT WITH LOREM IPSUM\nHISTORY, PURPOSE AND USAGE\nLorem ipsum, or lipsum as it is sometimes known, is dummy text used in laying out print, graphic or web designs. The passage is attributed to an unknown typesetter in the 15th century who is thought to have scrambled parts of Cicero\'s De Finibus Bonorum et Malorum for use in a type specimen book. It usually begins with:',
      title: 'My Title!',
      url: 'http://swift.org/modest',
    };

    let proposalDescription = proposalIPFSData.description;
    let proposalTitle = proposalIPFSData.title;
    let proposalUrl = proposalIPFSData.url;

    let descHash = await writeProposalIPFS(proposalIPFSData);
    let callData = await actionMock.methods.test2(addresses.TestAvatar).encodeABI();

    async function propose() {
      const prop = genericScheme.methods.proposeCall(addresses.TestAvatar, callData, 0, descHash);
      const proposalId = await prop.call();
      const { blockNumber } = await prop.send();
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

    const { proposalId: p1, timestamp: p1Creation } = await propose();

    const getProposal = `{
      proposal(id: "${p1}") {
          id
          descriptionHash
          stage
          createdAt
          executedAt
          proposer
          votingMachine

          genericScheme {
            id
            meta
 	          dao {
               id
            }
 	          contractToCall
            callData
            value
            executed
            returnValue
          }
          scheme {
            uGenericSchemeParams {
              contractToCall
            }
          }
      }
  }`;

  //   const metadata  = `{
  //     Metadata(where: {address: "${addresses.GenesisProtocol.toLowerCase()}"}) {
  //     data
  //   }
  // }`;

    // let resmetadata = await sendQuery(metadata)
    let proposalprint = await sendQuery(getProposal);
    console.log(proposalprint);


    // let proposal = (await sendQuery(getProposal)).proposal;
    // expect(proposal).toMatchObject({
    //   id: p1,
    //   descriptionHash: descHash,
    //   stage: 'Queued',
    //   createdAt: p1Creation.toString(),
    //   executedAt: null,
    //   proposer: web3.eth.defaultAccount.toLowerCase(),
    //   votingMachine: genesisProtocol.options.address.toLowerCase(),
    //
    //   genericScheme: {
    //     id: p1,
    //     dao: {
    //       id: addresses.TestAvatar.toLowerCase(),
    //     },
    //     contractToCall: actionMock.options.address.toLowerCase(),
    //     callData,
    //     value: '0',
    //     executed: false,
    //     returnValue: null,
    //   },
    //   scheme: {
    //     uGenericSchemeParams: {
    //       contractToCall: actionMock.options.address.toLowerCase(),
    //     },
    //   },
    // });
    //
    // await vote({
    //   proposalId: p1,
    //   outcome: PASS,
    //   voter: accounts[0].address,
    // });
    //
    // await vote({
    //   proposalId: p1,
    //   outcome: PASS,
    //   voter: accounts[1].address,
    // });
    //
    // await vote({
    //   proposalId: p1,
    //   outcome: PASS,
    //   voter: accounts[2].address,
    // });
    //
    // let executedAt = await vote({
    //   proposalId: p1,
    //   outcome: PASS,
    //   voter: accounts[3].address,
    // });
    //
    // const executedIsIndexed = async () => {
    //   return (await sendQuery(getProposal)).proposal.executedAt != null;
    // };
    //
    // await waitUntilTrue(executedIsIndexed);
    //
    // proposal = (await sendQuery(getProposal)).proposal;
    // expect(proposal).toMatchObject({
    //   id: p1,
    //   descriptionHash: descHash,
    //   stage: 'Executed',
    //   createdAt: p1Creation.toString(),
    //   executedAt: executedAt + '',
    //   proposer: web3.eth.defaultAccount.toLowerCase(),
    //   votingMachine: genesisProtocol.options.address.toLowerCase(),
    //
    //   genericScheme: {
    //     id: p1,
    //     dao: {
    //       id: addresses.TestAvatar.toLowerCase(),
    //     },
    //     contractToCall: actionMock.options.address.toLowerCase(),
    //     callData,
    //     value: '0',
    //     executed: true,
    //     returnValue: '0x0000000000000000000000000000000000000000000000000000000000000001',
    //   },
    // });

  }, 100000);
});
