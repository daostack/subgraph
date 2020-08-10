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

const Avatar = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/Avatar.json');
const SchemeFactory = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/SchemeFactory.json');
const DAOFactory = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/DAOFactory.json');
const FundingRequest = require(
  '@daostack/migration-experimental/contracts/' + getArcVersion() + '/FundingRequest.json',
);
const Join = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/Join.json');
const GenesisProtocol = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/GenesisProtocol.json');

describe('Join Scheme', () => {
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

    it('Join proposal', async () => {
      const genesisProtocol = new web3.eth.Contract(
        GenesisProtocol.abi,
        addresses.GenesisProtocol,
        opts,
      );
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

      // Let's register the token trade scheme on the DAO

      let joinScheme = new web3.eth.Contract(
        Join.abi,
        undefined,
        opts,
      );
      let initData = joinScheme.methods.initialize(
          (await schemeFactory.methods.avatar().call()),
          (await schemeFactory.methods.votingMachine().call()),
          ['50', '1800', '600', '600', '2199023255552', '172', '300', '5000000000000000000', '1', '100000000000000000000', '0'],
          '0x0000000000000000000000000000000000000000',
          (await schemeFactory.methods.voteParamsHash().call()),
          '0x0000000000000000000000000000000000000000',
          '100',
          '100',
          '1000',
          '10000000000',
        ).encodeABI();

      let proposeJoinRegistration = schemeFactory.methods.proposeScheme(
        getPackageVersion(),
        'Join',
        initData,
        '0x0000001f',
        '0x0000000000000000000000000000000000000000',
        '',
      );

      const registryProposalId = await proposeJoinRegistration.call();
      await proposeJoinRegistration.send();
      let proposalIsIndexed = async () => {
        return (await sendQuery(schemeFactoryNewSchemeProposalsQuery)).schemeFactoryNewSchemeProposals.length
          > prevProposalsLength;
      };

      await waitUntilTrue(proposalIsIndexed);

      let i = 0;
      let tx;
      let joinAddress;
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
          joinAddress = proxyEvents[0].returnValues._proxy;
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

      const avatar = new web3.eth.Contract(Avatar.abi, addresses.Avatar, opts);
      joinScheme = new web3.eth.Contract(
        Join.abi,
        joinAddress,
        opts,
      );

      const descHash =
        '0x000000000000000000000000000000000000000000000000000000000000abcd';
      const minFee = 100;
      const goal = 1000;
      async function propose({ from }) {
        const prop = joinScheme.methods.proposeToJoin(
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
        const { blockNumber } = await joinScheme.methods.redeemReputation(proposalId).send();
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

            join {
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
              joinParams {
                fundingToken
                minFeeToJoin
                memberReputation
                fundingGoal
                fundingGoalDeadline
              }
            }
        }
    }`;

      let proposal = (await sendQuery(getProposal)).proposal;
      let expected = {
        id: p1,
        descriptionHash: descHash,
        stage: 'Queued',
        createdAt: p1Creation.toString(),
        executedAt: null,
        proposer: accounts[6].address.toLowerCase(),
        votingMachine: genesisProtocol.options.address.toLowerCase(),

        scheme: {
          joinParams: {
            fundingToken: '0x0000000000000000000000000000000000000000',
            minFeeToJoin: (goal / 10).toString(),
            memberReputation: '100',
            fundingGoal: goal.toString(),
            fundingGoalDeadline: '10000000000',
          },
        },
        join: null,
      };

      expected.join = {
        id: p1,
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        proposedMember: accounts[6].address.toLowerCase(),
        funding: (minFee * 5).toString(),
        executed: false,
        reputationMinted: '0',
      };

      expect(proposal).toMatchObject(expected);

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

      executedIsIndexed = async () => {
        return (await sendQuery(getProposal)).proposal.executedAt != false;
      };

      await waitUntilTrue(executedIsIndexed);

      proposal = (await sendQuery(getProposal)).proposal;
      let expected2 = {
        id: p1 as any,
        descriptionHash: descHash,
        stage: 'Executed',
        createdAt: p1Creation.toString(),
        executedAt: executedAt + '',
        proposer: accounts[6].address.toLowerCase(),
        votingMachine: genesisProtocol.options.address.toLowerCase(),

        join: null,
      };

      expected2.join = {
        id: p1 as any,
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        proposedMember: accounts[6].address.toLowerCase(),
        funding: (minFee * 5).toString(),
        executed: true,
        reputationMinted: '0',
      };

      expect(proposal).toMatchObject(expected2);

      await redeem({ proposalId: p1 });
      const redeemIsIndexed = async () => {
        return (await sendQuery(getProposal)).proposal.reputationMinted != '0';
      };

      await waitUntilTrue(redeemIsIndexed);

      proposal = (await sendQuery(getProposal)).proposal;
      let expected3 = {
        id: p1 as any,
        descriptionHash: descHash,
        stage: 'Executed',
        createdAt: p1Creation.toString(),
        executedAt: executedAt + '',
        proposer: accounts[6].address.toLowerCase(),
        votingMachine: genesisProtocol.options.address.toLowerCase(),

        join: null,
      };

      expected3.join = {
        id: p1 as any,
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
        proposedMember: accounts[6].address.toLowerCase(),
        funding: (minFee * 5).toString(),
        executed: true,
        reputationMinted: '100',
      };

      expect(proposal).toMatchObject(expected3);

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

      const getDao = `{
        dao(id: "${addresses.Avatar.toLowerCase()}") {
          ethBalance
        }
      }`;

      let vault = await avatar.methods.vault().call();
      let dao = (await sendQuery(getDao)).dao;
      expect(dao).toEqual({
        ethBalance: await web3.eth.getBalance((vault)),
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

      let executedIsIndexed = async () => {
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
