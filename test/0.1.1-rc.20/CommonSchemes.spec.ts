import {
    getArcVersion,
    getContractAddresses,
    getOptions,
    getWeb3,
    prepareReputation,
    sendQuery,
    waitUntilTrue,
  } from './util';

const Avatar = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/Avatar.json');
const Reputation = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/Reputation.json');
const FundingRequest = require(
  '@daostack/migration-experimental/contracts/' + getArcVersion() + '/FundingRequest.json',
);
const JoinAndQuit = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/JoinAndQuit.json');
const GenesisProtocol = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/GenesisProtocol.json');

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
      const avatar = new web3.eth.Contract(Avatar.abi, addresses.Avatar, opts);
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
      const goal = 1000;
      async function propose({ from }) {
        const prop = joinAndQuit.methods.proposeToJoin(
          descHash,
          minFee * 5,
        );
        const proposalId = await prop.call({ value: minFee * 5, from });
        const { blockNumber } = await prop.send({ value: minFee * 5, from });
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

      async function rageQuit({ quitter }) {
        const { blockNumber } = await joinAndQuit.methods.rageQuit().send({from: quitter});
        const { timestamp } = await web3.eth.getBlock(blockNumber);
        return timestamp;
      }

      const { proposalId: p1, timestamp: p1Creation } = await propose({ from: accounts[6].address });
      const { proposalId: p2 } = await propose({ from: accounts[7].address });

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
                fundingGoalDeadline
                rageQuitEnable
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
        proposer: accounts[6].address.toLowerCase(),
        votingMachine: genesisProtocol.options.address.toLowerCase(),

        joinAndQuit: {
          id: p1,
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          proposedMember: accounts[6].address.toLowerCase(),
          funding: (minFee * 5).toString(),
          executed: false,
          reputationMinted: '0',
        },
        scheme: {
          joinAndQuitParams: {
            fundingToken: '0x0000000000000000000000000000000000000000',
            minFeeToJoin: (goal / 10).toString(),
            memberReputation: '100',
            fundingGoal: goal.toString(),
            fundingGoalDeadline: '10000000000',
            rageQuitEnable: true,
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
        proposer: accounts[6].address.toLowerCase(),
        votingMachine: genesisProtocol.options.address.toLowerCase(),

        joinAndQuit: {
          id: p1,
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          proposedMember: accounts[6].address.toLowerCase(),
          funding: (minFee * 5).toString(),
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
        proposer: accounts[6].address.toLowerCase(),
        votingMachine: genesisProtocol.options.address.toLowerCase(),

        joinAndQuit: {
          id: p1,
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          proposedMember: accounts[6].address.toLowerCase(),
          funding: (minFee * 5).toString(),
          executed: true,
          reputationMinted: '100',
        },
      });

      await vote({
        proposalId: p2,
        outcome: PASS,
        voter: accounts[0].address,
      });

      await vote({
        proposalId: p2,
        outcome: PASS,
        voter: accounts[1].address,
      });

      await vote({
        proposalId: p2,
        outcome: PASS,
        voter: accounts[2].address,
      });

      await rageQuit({ quitter: accounts[7].address });

      let vault = await avatar.methods.vault().call();
      let refund = await web3.eth.getBalance((vault));

      const getDao = `{
        dao(id: "${addresses.Avatar.toLowerCase()}") {
          ethBalance
        }
      }`;

      let dao = (await sendQuery(getDao)).dao;
      expect(dao).toEqual({
        ethBalance: refund,
      });

      const getRageQuits = `{
        rageQuitteds {
          dao {
            id
         }
          rageQuitter
          refund
        }
      }`;

      let rageQuits = (await sendQuery(getRageQuits)).rageQuitteds;
      expect(rageQuits).toContainEqual({
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        rageQuitter: accounts[7].address.toLowerCase(),
        refund: refund.toString(),
      });

      dao = (await sendQuery(getDao)).dao;
      expect(dao).toEqual({
        ethBalance: '0',
      });
    }, 100000);

    it('FundingRequest proposal', async () => {
      const fundingRequest = new web3.eth.Contract(
        FundingRequest.abi,
        addresses.FundingRequest,
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
        const prop = fundingRequest.methods.propose(
          accounts[1].address,
          minFee,
          descHash,
        );
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

      async function redeem({ proposalId }) {
        const { blockNumber } = await fundingRequest.methods.redeem(proposalId).send();
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

            fundingRequest {
              id
              dao {
                 id
              }
              beneficiary
              amount
              executed
              amountRedeemed
            }
            scheme {
              fundingRequestParams {
                fundingToken
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

        fundingRequest: {
          id: p1,
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          beneficiary: accounts[1].address.toLowerCase(),
          amount: minFee.toString(),
          executed: false,
          amountRedeemed: '0',
        },
        scheme: {
          fundingRequestParams: {
            fundingToken: '0x0000000000000000000000000000000000000000',
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

        fundingRequest: {
          id: p1,
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          beneficiary: accounts[1].address.toLowerCase(),
          amount: minFee.toString(),
          executed: true,
          amountRedeemed: '0',
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

        fundingRequest: {
          id: p1,
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          beneficiary: accounts[1].address.toLowerCase(),
          amount: minFee.toString(),
          executed: true,
          amountRedeemed: minFee.toString(),
        },
      });
    }, 100000);
  });
