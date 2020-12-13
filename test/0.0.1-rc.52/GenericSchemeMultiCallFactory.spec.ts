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

const GenesisProtocol = require('@daostack/migration/contracts/' + getArcVersion() + '/GenesisProtocol.json');
const GenericSchemeMultiCallFactory = require(
    '@daostack/migration/contracts/' + getArcVersion() + '/GenericSchemeMultiCallFactory.json',
);
const GenericSchemeMultiCall = require(
    '@daostack/migration/contracts/' + getArcVersion() + '/GenericSchemeMultiCall.json',
);
const ActionMock = require('@daostack/migration/contracts/' + getArcVersion() + '/ActionMock.json');
const SchemeRegistrar = require('@daostack/migration/contracts/' + getArcVersion() + '/SchemeRegistrar.json');

describe('GenericSchemeMultiCallFactory', () => {
    let web3;
    let addresses;
    let opts;
    let genericSchemeMultiCallFactory;
    let actionMock;
    let schemeRegistrar;
    let genesisProtocol;
    beforeAll(async () => {
        web3 = await getWeb3();
        addresses = getContractAddresses();
        opts = await getOptions(web3);
        genericSchemeMultiCallFactory = new web3.eth.Contract(
            GenericSchemeMultiCallFactory.abi, addresses.GenericSchemeMultiCallFactory, opts);
        actionMock = new web3.eth.Contract(
            ActionMock.abi,
            addresses.ActionMock,
            opts,
        );
        schemeRegistrar = new web3.eth.Contract(SchemeRegistrar.abi, addresses.SchemeRegistrar, opts);
        genesisProtocol = new web3.eth.Contract(
            GenesisProtocol.abi,
            addresses.GenesisProtocol,
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
        const genericSchemeMultiCallCreateTx =
        genericSchemeMultiCallFactory.methods.createGenericSchemeMultiCallSimple(
            addresses.Avatar,
            addresses.GenesisProtocol,
            1,
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            '0x0000000000000000000000000000000000000000',
            [actionMock.options.address],
            '0x0000000000000000000000000000000000000000',
        );

        const genericSchemeMultiCallAddress = await genericSchemeMultiCallCreateTx.call();

        await genericSchemeMultiCallCreateTx.send(
            { from: accounts[0].address },
        );

        const getContractInfo = `{
            contractInfos(where: {address: "${genericSchemeMultiCallAddress.toLowerCase()}"}) {
                name
            }
        }`;

        const schemeIsIndexed = async () => {
            return (await sendQuery(getContractInfo)).contractInfos.length > 0;
        };

        await waitUntilTrue(schemeIsIndexed);

        let { contractInfos } = await sendQuery(getContractInfo);

        expect(contractInfos).toContainEqual({
            name: 'GenericSchemeMultiCall',
        });

        // Register the schemes
        let proposeScheme = schemeRegistrar.methods.proposeScheme(
            addresses.Avatar,
            genericSchemeMultiCallAddress,
            '0x0000000000000000000000000000000000000000',
            '0x0000001f',
            '0x000000000000000000000000000000000000000000000000000000000000abcd',
        );

        const proposeSchemeProposalId = await proposeScheme.call();
        await proposeScheme.send();

        for (let i = 0; i < 4; i++) {
            await genesisProtocol.methods.vote(
            proposeSchemeProposalId,
            1,
            0,
            accounts[0].address /* unused by the contract */)
            .send({ from: accounts[i].address });
        }

        let genericSchemeMultiCall = new web3.eth.Contract(
            GenericSchemeMultiCall.abi, genericSchemeMultiCallAddress, opts);

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

        const { proposalId: p1, timestamp: p1Creation } = await propose();

        const getProposal = `{
            proposal(id: "${p1}") {
                id
                descriptionHash
                stage
                createdAt
                executedAt
                proposer

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
                  }
                }
            }
        }`;

        const proposalIsIndexed = async () => {
            return (await sendQuery(getProposal)).proposal != null;
        };

        await waitUntilTrue(proposalIsIndexed);

        let proposal = (await sendQuery(getProposal)).proposal;

        expect(proposal).toMatchObject({
            id: p1,
            descriptionHash,
            stage: 'Queued',
            createdAt: p1Creation.toString(),
            executedAt: null,
            proposer: web3.eth.defaultAccount.toLowerCase(),

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
                },
            },
        });

    }, 100000);
});
