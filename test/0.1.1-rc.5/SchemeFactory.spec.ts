import {
  getArcVersion,
  getContractAddresses,
  getOptions,
  getWeb3,
  prepareReputation,
  sendQuery,
  waitUntilTrue,
} from './util';

const GenesisProtocol = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/GenesisProtocol.json');
const DAOFactory = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/DAOFactory.json');
const SchemeFactory = require('@daostack/migration-experimental/contracts/' + getArcVersion() + '/SchemeFactory.json');

describe('SchemeFactory', () => {
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

    it('Sanity', async () => {
        const genesisProtocol = new web3.eth.Contract(
          GenesisProtocol.abi,
          addresses.GenesisProtocol,
          opts,
        );

        let daoFactory = new web3.eth.Contract(DAOFactory.abi, addresses.DAOFactoryInstance, opts);

        const descHash = '0x0000000000000000000000000000000000000000000000000000000000000123';

        const schemeFactoryNewSchemeProposalsQuery = `{
          schemeFactoryNewSchemeProposals {
            txHash,
            contract,
            avatar,
            descriptionHash,
            votingMachine,
            proposalId,
            schemeName,
            schemeData,
            packageVersion,
            permission,
            schemeToReplace
          }
        }`;

        let prevProposalsLength = (
          await sendQuery(schemeFactoryNewSchemeProposalsQuery)
        ).schemeFactoryNewSchemeProposals.length;

        let initData = schemeFactory
                         .methods
                         .initialize(
                            (await schemeFactory.methods.avatar().call()),
                            (await schemeFactory.methods.votingMachine().call()),
                            (await schemeFactory.methods.voteParams().call()),
                            (await schemeFactory.methods.daoFactory().call()),
                          ).encodeABI();
        let propose = schemeFactory.methods.proposeScheme(
          [0, 1, 5],
          'SchemeFactory',
          initData,
          '0x0000001f',
          schemeFactory.options.address,
          descHash,
        );

        const proposalId = await propose.call();
        let { transactionHash: proposaTxHash } = await propose.send();

        const proposalIsIndexed = async () => {
          return (await sendQuery(schemeFactoryNewSchemeProposalsQuery)).schemeFactoryNewSchemeProposals.length
           > prevProposalsLength;
        };

        await waitUntilTrue(proposalIsIndexed);

        const { schemeFactoryNewSchemeProposals } = await sendQuery(schemeFactoryNewSchemeProposalsQuery, 3000);

        expect(schemeFactoryNewSchemeProposals).toContainEqual({
            avatar: addresses.Avatar.toLowerCase(),
            contract: schemeFactory.options.address.toLowerCase(),
            descriptionHash: descHash,
            proposalId,
            txHash: proposaTxHash,
            votingMachine: addresses.GenesisProtocol.toLowerCase(),
            schemeName: 'SchemeFactory',
            schemeData: initData,
            packageVersion: ['0', '1', '5'],
            permission: '0x0000001f',
            schemeToReplace: schemeFactory.options.address.toLowerCase(),
        });

        let i = 0;
        for (i = 0; i < 2; i++) {
            await genesisProtocol.methods.vote(
                                      proposalId,
                                      1,
                                      0,
                                      accounts[0].address /* unused by the contract */)
                                      .send({ from: accounts[i].address });
        }

        const getSchemeFactoryProposalExecuteds = `{
          schemeFactoryProposalExecuteds {
            txHash,
            contract,
            avatar,
            proposalId,
            decision
          }
      }`;

        let prevExecutedsLength = (
            await sendQuery(getSchemeFactoryProposalExecuteds)
          ).schemeFactoryProposalExecuteds.length;

        // pass the proposals
        let tx = await genesisProtocol.methods.vote(
                                                                proposalId,
                                                                1,
                                                                0,
                                                                accounts[0].address /* unused by the contract */)
                                                                .send({ from: accounts[i].address });
        let executeTxHash = tx.transactionHash;

        const getControllerSchemes = `{
          controllerSchemes {
            dao {
              id
            }
            address
            isRegistered
          }
        }`;

        const getDAO = `{
          dao(id: "${addresses.Avatar.toLowerCase()}") {
            schemes {
              address
            }
          }
        }`;

        while ((await genesisProtocol.methods.proposals(proposalId).call()).state !== '2') {
          i++;
          tx = (await genesisProtocol.methods.vote(
            proposalId,
            1,
            0,
            accounts[i].address)
            .send({ from: accounts[i].address }));

          executeTxHash = tx.transactionHash;

          if ((await genesisProtocol.methods.proposals(proposalId).call()).state === '2') {
            let proxyEvents = await daoFactory.getPastEvents(
              'ProxyCreated',
              {
                fromBlock: tx.blockNumber,
                toBlock: tx.blockNumber,
              },
            );
            let schemeAddress = proxyEvents[0].returnValues._proxy;

            // query for scheme entity
            let controllerSchemes = (await sendQuery(getControllerSchemes, 2000)).controllerSchemes;
            expect(controllerSchemes).toContainEqual({
              dao: {
                id: addresses.Avatar.toLowerCase(),
              },
              address: schemeFactory.options.address.toLowerCase(),
              isRegistered: false,
            });

            expect(controllerSchemes).toContainEqual({
              dao: {
                id: addresses.Avatar.toLowerCase(),
              },
              address: schemeAddress.toLowerCase(),
              isRegistered: true,
            });

            expect((await sendQuery(getDAO)).dao.schemes).toContainEqual(
              {
                  address: schemeAddress.toLowerCase(),
              },
            );
          }
        }

        const executedIsIndexed = async () => {
          return (await sendQuery(getSchemeFactoryProposalExecuteds)).schemeFactoryProposalExecuteds.length
           > prevExecutedsLength;
        };

        await waitUntilTrue(executedIsIndexed);

        const { schemeFactoryProposalExecuteds } = await sendQuery(getSchemeFactoryProposalExecuteds);

        expect(schemeFactoryProposalExecuteds).toContainEqual({
          avatar: addresses.Avatar.toLowerCase(),
          contract: schemeFactory.options.address.toLowerCase(),
          proposalId,
          txHash: executeTxHash,
          decision: '1',
        });

        const { schemeFactoryProposals } = await sendQuery(`{
            schemeFactoryProposals {
              dao {
                id
              }
              id
              schemeToRegisterName
              schemeToRegisterData
              schemeToRegisterPackageVersion
              schemeToRegisterPermission
              schemeToRemove
              decision
              schemeRegistered
              schemeRemoved
            }
        }`);

        expect(schemeFactoryProposals).toContainEqual({
          dao: { id : addresses.Avatar.toLowerCase() },
          id: proposalId,
          schemeToRegisterName: 'SchemeFactory',
          schemeToRegisterData: initData,
          schemeToRegisterPackageVersion: ['0', '1', '5'],
          schemeToRegisterPermission: '0x0000001f',
          schemeToRemove: schemeFactory.options.address.toLowerCase(),
          decision: '1',
          schemeRegistered: true,
          schemeRemoved: true,
        });
    }, 100000);
});
