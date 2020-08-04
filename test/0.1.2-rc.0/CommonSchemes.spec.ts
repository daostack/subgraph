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
const DAOToken = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/DAOToken.json');
const FundingRequest = require(
  '@daostack/migration-experimental/contracts/' + getArcVersion() + '/FundingRequest.json',
);
const JoinAndQuit = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/JoinAndQuit.json');
const GenesisProtocol = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/GenesisProtocol.json');
const TokenTrade = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/TokenTrade.json');
const SchemeFactory = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/SchemeFactory.json');

describe('JoinAndQuit Scheme', () => {
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

      await rageQuit({ quitter: accounts[7].address });

      let refund = await web3.eth.getBalance((vault));

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
        ethBalance: refund,
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

    it('TokenTrade proposal', async () => {
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

      const externalToken1 =
        await new web3.eth.Contract(DAOToken.abi, undefined, opts)
          .deploy({ data: DAOToken.bytecode,  arguments: []}).send();
        await externalToken1.methods.initialize('Test Token One', 'TSTF', '10000000000', accounts[1].address).send();
        await externalToken1.methods.mint(addresses.Avatar, '1000000').send({ from: accounts[1].address });
        await externalToken1.methods.mint(accounts[0].address, '1000000').send({ from: accounts[1].address });
        
      const externalToken2 =
        await new web3.eth.Contract(DAOToken.abi, undefined, opts)
          .deploy({ data: DAOToken.bytecode,  arguments: []}).send();
        await externalToken2.methods.initialize('Test Token Second', 'TSTS', '10000000000', accounts[1].address).send();
        await externalToken2.methods.mint(accounts[0].address, '1000000').send({ from: accounts[1].address });
        await externalToken2.methods.mint(addresses.Avatar, '1000000').send({ from: accounts[1].address });
        
        await web3.eth.sendTransaction({
            from: accounts[0].address,
            to: addresses.Avatar,
            value: 10,
            gas: 2000000,
            data: '0x',
        });

      // Let's register the token trade scheme on the DAO
      const tokenTrade = new web3.eth.Contract(
        TokenTrade.abi,
        addresses.TokenTrade,
        opts,
      );
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
      await proposeTokenTradeRegistration.send();

      proposalIsIndexed = async () => {
          return (await sendQuery(schemeFactoryNewSchemeProposalsQuery)).schemeFactoryNewSchemeProposals.length
           > prevProposalsLength;
        };

      await waitUntilTrue(proposalIsIndexed);

      prevExecutedsLength = (
          await sendQuery(getSchemeFactoryProposalExecuteds)
        ).schemeFactoryProposalExecuteds.length;

      let k = 0;
      while ((await genesisProtocol.methods.proposals(registryProposalId).call()).state !== '2') {
          await genesisProtocol.methods.vote(
            registryProposalId,
            1,
            0,
            accounts[k].address,
          ).send({ from: accounts[k].address });
          k++;
        }

      executedIsIndexed = async () => {
          return (await sendQuery(getSchemeFactoryProposalExecuteds)).schemeFactoryProposalExecuteds.length
           > prevExecutedsLength;
        };

      await waitUntilTrue(executedIsIndexed);

      // Now we create proposals on our scheme
      const receiveTokenAddress = externalToken1.options.address;
      const sendTokenAddress = externalToken2.options.address;
      const sendTokenAmount = 100;
      const receiveTokenAmount = 200;
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

      const { proposalId: p1, timestamp: p1Creation } = await propose({ from : accounts[1].address.toLowerCase() });

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

      let proposal = (await sendQuery(getProposal)).proposal;

      expect(proposal).toMatchObject({
        id: p1,
        descriptionHash: descHash,
        stage: 'Queued',
        createdAt: p1Creation.toString(),
        executedAt: null,
        proposer: accounts[1].address.toLowerCase(),
        votingMachine: genesisProtocol.options.address.toLowerCase(),

        joinAndQuit: {
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
          sendTokenAddress,
          sendTokenAmount,
          receiveTokenAddress,
          receiveTokenAmount,
          executed: true,
          redeemed: false,
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
          sendTokenAddress,
          sendTokenAmount,
          receiveTokenAddress,
          receiveTokenAmount,
          executed: true,
          redeemed: true,
        },
      });

    }, 200000);
  });
