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

const JoinAndQuit = require('@daostack/migration-experimental/contracts/0.1.1-rc.8/JoinAndQuit.json');
const GenesisProtocol = require('@daostack/migration-experimental/contracts/0.1.1-rc.8/GenesisProtocol.json');

describe('JoinAndQuit Scheme', () => {
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

    it('JoinAndQuit proposal', async () => {

      const joinAndQuit = new web3.eth.Contract(
        JoinAndQuit.abi,
        addresses.JoinAndQuit,
        opts,
      );
      const genesisProtocol = new web3.eth.Contract(
        GenesisProtocol.abi,
        addresses.GenesisProtocol,
        opts,
      );

      const descHash =
        '0x000000000000000000000000000000000000000000000000000000000000abcd';
      const minFee = 100;
      async function propose() {
        const prop = joinAndQuit.methods.proposeToJoin(
          descHash,
          minFee,
          accounts[6].address,
        );
        const proposalId = await prop.call({ value: minFee });
        const { blockNumber } = await prop.send({ value: minFee });
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
        const { blockNumber } = await joinAndQuit.methods.redeemReputation(proposalId).send();
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

            joinAndQuit {
              id
              dao {
                 id
              }
              proposedMember
              funder
              funding
              executed
              reputationMinted
            }
            scheme {
              joinAndQuitParams {
                fundingToken
                minFeeToJoin
                memberReputation
                fundingGoal
                fundingGoalDeadLine
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

        joinAndQuit: {
          id: p1,
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          proposedMember: accounts[6].address.toLowerCase(),
          funder: accounts[0].address.toLowerCase(),
          funding: minFee.toString(),
          executed: false,
          reputationMinted: '0',
        },
        scheme: {
          joinAndQuitParams: {
            fundingToken: '0x0000000000000000000000000000000000000000',
            minFeeToJoin: minFee.toString(),
            memberReputation: '100',
            fundingGoal: (minFee * 10).toString(),
            fundingGoalDeadLine: '10000000000',
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

      await vote({
        proposalId: p1,
        outcome: PASS,
        voter: accounts[2].address,
      });

      let executedAt = await vote({
        proposalId: p1,
        outcome: PASS,
        voter: accounts[3].address,
      });

      const executedIsIndexed = async () => {
        return (await sendQuery(getProposal)).proposal.executedAt != false;
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

        joinAndQuit: {
          id: p1,
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          proposedMember: accounts[6].address.toLowerCase(),
          funder: accounts[0].address.toLowerCase(),
          funding: minFee.toString(),
          executed: true,
          reputationMinted: '0',
        },
      });

      await redeem({ proposalId: p1 });
      const redeemIsIndexed = async () => {
        return (await sendQuery(getProposal)).proposal.reputationMinted != '0';
      };

      await waitUntilTrue(redeemIsIndexed);

      proposal = (await sendQuery(getProposal)).proposal;
      expect(proposal).toMatchObject({
        id: p1,
        descriptionHash: descHash,
        stage: 'Executed',
        createdAt: p1Creation.toString(),
        executedAt: executedAt + '',
        proposer: web3.eth.defaultAccount.toLowerCase(),
        votingMachine: genesisProtocol.options.address.toLowerCase(),

        joinAndQuit: {
          id: p1,
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          proposedMember: accounts[6].address.toLowerCase(),
          funder: accounts[0].address.toLowerCase(),
          funding: minFee.toString(),
          executed: true,
          reputationMinted: '100',
        },
      });

    }, 100000);
  });
