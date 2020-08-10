import {
    getContractAddresses,
    getOptions,
    getWeb3,
    prepareReputation,
    sendQuery,
    waitUntilTrue,
  } from './util';

const ActionMock = require('@daostack/migration-experimental/contracts/0.1.2-rc.6/ActionMock.json');
const GenericScheme = require('@daostack/migration-experimental/contracts/0.1.2-rc.6/GenericScheme.json');
const GenesisProtocol = require('@daostack/migration-experimental/contracts/0.1.2-rc.6/GenesisProtocol.json');

describe('Generic Scheme', () => {
    let web3;
    let addresses;
    let opts;
    let accounts;

    beforeAll(async () => {
      web3 = await getWeb3();
      addresses = getContractAddresses();
      opts = await getOptions(web3);
      accounts = web3.eth.accounts.wallet;
      await prepareReputation(web3, addresses, opts, accounts);
    }, 100000);

    it('generic scheme proposal', async () => {

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

      const descHash =
        '0x000000000000000000000000000000000000000000000000000000000000abcd';
      let callData = await actionMock.methods.test2(addresses.Avatar).encodeABI();

      async function propose() {
        const prop = genericScheme.methods.proposeCall(callData, 0, descHash);
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
              genericSchemeParams {
                contractToCall
              }
            }
        }
    }`;

      let proposal = (await sendQuery(getProposal)).proposal;
      expect(proposal).toMatchObject({
        id: p1,
        descriptionHash: descHash,
        stage: 'Queued',
        createdAt: p1Creation.toString(),
        executedAt: null,
        proposer: web3.eth.defaultAccount.toLowerCase(),
        votingMachine: genesisProtocol.options.address.toLowerCase(),

        genericScheme: {
          id: p1,
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          contractToCall: '0x0000000000000000000000000000000000000000',
          callData,
          value: '0',
          executed: false,
          returnValue: null,
        },
        scheme: {
          genericSchemeParams: {
            contractToCall: '0x0000000000000000000000000000000000000000',
          },
        },
      });

      await vote({
        proposalId: p1,
        outcome: PASS,
        voter: accounts[0].address,
      });

      await vote({
        proposalId: p1,
        outcome: PASS,
        voter: accounts[1].address,
      });

      let executedAt = await vote({
        proposalId: p1,
        outcome: PASS,
        voter: accounts[2].address,
      });

      const executedIsIndexed = async () => {
        return (await sendQuery(getProposal)).proposal.executedAt != null;
      };

      await waitUntilTrue(executedIsIndexed);

      proposal = (await sendQuery(getProposal)).proposal;
      expect(proposal).toMatchObject({
        id: p1,
        descriptionHash: descHash,
        stage: 'Executed',
        createdAt: p1Creation.toString(),
        executedAt: executedAt + '',
        proposer: web3.eth.defaultAccount.toLowerCase(),
        votingMachine: genesisProtocol.options.address.toLowerCase(),

        genericScheme: {
          id: p1,
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          contractToCall: '0x0000000000000000000000000000000000000000',
          callData,
          value: '0',
          executed: true,
          returnValue: '0x',
        },
      });

    }, 100000);
  });
