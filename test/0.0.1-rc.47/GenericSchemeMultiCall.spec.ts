import { nullAddress } from '../0.0.1-rc.16/util';
import {
    getArcVersion,
    getContractAddresses,
    getOptions,
    getWeb3,
    increaseTime,
    sendQuery,
    waitUntilTrue,
    writeProposalIPFS,
} from './util';

const GenericSchemeMultiCall = require(
    '@daostack/migration/contracts/' + getArcVersion() + '/GenericSchemeMultiCall.json',
);
const ActionMock = require('@daostack/migration/contracts/' + getArcVersion() + '/ActionMock.json');
const DxDaoSchemeConstraints = require('@daostack/migration/contracts/' + getArcVersion() + '/DxDaoSchemeConstraints.json');
const DAOToken = require('@daostack/migration/contracts/' + getArcVersion() + '/DAOToken.json');
const GenesisProtocol = require('@daostack/migration/contracts/' + getArcVersion() + '/GenesisProtocol.json');
const Reputation = require('@daostack/migration/contracts/' + getArcVersion() + '/Reputation.json');

describe('GenericSchemeMultiCall', () => {
    let web3;
    let addresses;
    let opts;
    let genericSchemeMultiCall;
    let dxDaoSchemeConstraints;
    let genesisProtocol;
    let reputation;
    let actionMock;
    beforeAll(async () => {
        web3 = await getWeb3();
        addresses = getContractAddresses();
        opts = await getOptions(web3);
        genericSchemeMultiCall = new web3.eth.Contract(
            GenericSchemeMultiCall.abi, addresses.GenericSchemeMultiCall, opts);
        dxDaoSchemeConstraints = new web3.eth.Contract(
            DxDaoSchemeConstraints.abi, addresses.DxDaoSchemeConstraints, opts);
        genesisProtocol = new web3.eth.Contract(GenesisProtocol.abi, addresses.GenesisProtocol, opts);
        reputation = await new web3.eth.Contract(Reputation.abi, addresses.NativeReputation, opts);
        actionMock = new web3.eth.Contract(
            ActionMock.abi,
            addresses.ActionMock,
            opts,
        );
    });

    it('Sanity', async () => {
        const accounts = web3.eth.accounts.wallet;

        await web3.eth.sendTransaction({
            from: accounts[0].address,
            to: addresses.Avatar,
            value: 10,
            gas: 2000000,
            data: '0xABCD',
        });

        await dxDaoSchemeConstraints.methods.updateContractsWhitelist(
            [actionMock.options.address, nullAddress], [true, false]).send(
            { from: accounts[0].address },
        );

        let contractsToCall = [actionMock.options.address.toLowerCase()];
        let callsData = [actionMock.methods.test2(addresses.Avatar).encodeABI()];
        let values = ['10'];
        let descriptionHash = '0x000000000000000000000000000000000000000000000000000000000000abcd';
        async function propose() {
            const prop = genericSchemeMultiCall.methods.proposeCalls(
                contractsToCall,
                callsData,
                values,
                descriptionHash,
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

                genericSchemeMultiCall {
                  id
                  dao {
                     id
                  }
                  contractsToCall
                  callsData
                  values
                  executed
                  returnValues
                }
                scheme {
                  genericSchemeMultiCallParams {
                    contractsWhiteList
                    schemeConstraints
                  }
                }
            }
        }`;

        let proposal = (await sendQuery(getProposal)).proposal;
        expect(proposal).toMatchObject({
            id: p1,
            descriptionHash,
            stage: 'Queued',
            createdAt: p1Creation.toString(),
            executedAt: null,
            proposer: web3.eth.defaultAccount.toLowerCase(),
            votingMachine: genesisProtocol.options.address.toLowerCase(),

            genericSchemeMultiCall: {
                id: p1,
                dao: {
                    id: addresses.Avatar.toLowerCase(),
                },
                contractsToCall,
                callsData,
                values,
                executed: false,
                returnValues: null,
            },
            scheme: {
                genericSchemeMultiCallParams: {
                    contractsWhiteList: [addresses.ActionMock.toLowerCase()],
                    schemeConstraints: addresses.DxDaoSchemeConstraints.toLowerCase(),
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

        await genericSchemeMultiCall.methods.execute(p1).send();

        const executedIsIndexed = async () => {
            return (await sendQuery(getProposal)).proposal.executedAt != null;
        };

        await waitUntilTrue(executedIsIndexed);

        proposal = (await sendQuery(getProposal)).proposal;
        expect(proposal).toMatchObject({
            id: p1,
            descriptionHash,
            stage: 'Executed',
            createdAt: p1Creation.toString(),
            executedAt: executedAt + '',
            proposer: web3.eth.defaultAccount.toLowerCase(),
            votingMachine: genesisProtocol.options.address.toLowerCase(),

            genericSchemeMultiCall: {
                id: p1,
                dao: {
                    id: addresses.Avatar.toLowerCase(),
                },
                contractsToCall,
                callsData,
                values,
                executed: true,
                returnValues: ['0x0000000000000000000000000000000000000000000000000000000000000001'],
            },
        });
    }, 100000);
});
