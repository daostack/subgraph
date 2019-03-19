import {
  getContractAddresses,
  getOptions,
  getWeb3,
  sendQuery,
  waitUntilTrue,
} from './util';

const AbsoluteVote = require('@daostack/arc/build/contracts/AbsoluteVote.json');
const SchemeRegistrar = require('@daostack/arc/build/contracts/SchemeRegistrar.json');

describe('SchemeRegistrar', () => {
    let web3;
    let addresses;
    let opts;
    let schemeRegistrar;
    beforeAll(async () => {
        web3 = await getWeb3();
        addresses = getContractAddresses();
        opts = await getOptions(web3);
        schemeRegistrar = new web3.eth.Contract(SchemeRegistrar.abi, addresses.SchemeRegistrar, opts);
    });

    it('Sanity', async () => {
        const accounts = web3.eth.accounts.wallet;
        const absVote = new web3.eth.Contract(
          AbsoluteVote.abi,
          addresses.AbsoluteVote,
          opts,
        );

        const descHash = '0x0000000000000000000000000000000000000000000000000000000000000123';
        const registerSchemeParamsHash = '0x0000000000000000000000000000000000000000000000000000000000001234';

        let propose = schemeRegistrar.methods.proposeScheme(
            addresses.Avatar,
            accounts[0].address,
            registerSchemeParamsHash,
            '0x0000001f',
            descHash,
        );
        const proposalId = await propose.call();
        let { transactionHash: proposaTxHash } = await propose.send();

        const schemeRegistrarNewSchemeProposalsQuery = `{
          schemeRegistrarNewSchemeProposals {
            txHash,
            contract,
            avatar,
            descriptionHash,
            votingMachine,
            proposalId,
            scheme,
            paramsHash,
            permission,
          }
        }`;

        const proposalIsIndexed = async () => {
          let query = (await sendQuery(schemeRegistrarNewSchemeProposalsQuery)).schemeRegistrarNewSchemeProposals;
          return query.length > 0 && query[query.length - 1].txHash === proposaTxHash;
        };

        await waitUntilTrue(proposalIsIndexed);

        const { schemeRegistrarNewSchemeProposals } = await sendQuery(schemeRegistrarNewSchemeProposalsQuery, 3000);

        expect(schemeRegistrarNewSchemeProposals).toContainEqual({
            avatar: addresses.Avatar.toLowerCase(),
            contract: schemeRegistrar.options.address.toLowerCase(),
            descriptionHash: descHash,
            proposalId,
            txHash: proposaTxHash,
            votingMachine: addresses.AbsoluteVote.toLowerCase(),
            scheme: accounts[0].address.toLowerCase(),
            paramsHash: registerSchemeParamsHash,
            permission: '0x0000001f',
        });

        propose = schemeRegistrar.methods.proposeToRemoveScheme(
            addresses.Avatar,
            accounts[0].address,
            descHash,
        );
        const removeProposalId = await propose.call();
        const { transactionHash: removeProposaTxHash } = await propose.send();

        const { schemeRegistrarRemoveSchemeProposals } = await sendQuery(`{
            schemeRegistrarRemoveSchemeProposals {
              txHash,
              contract,
              avatar,
              descriptionHash,
              votingMachine,
              proposalId,
              scheme
            }
        }`);

        expect(schemeRegistrarRemoveSchemeProposals).toContainEqual({
            avatar: addresses.Avatar.toLowerCase(),
            contract: schemeRegistrar.options.address.toLowerCase(),
            descriptionHash: descHash,
            proposalId: removeProposalId,
            txHash: removeProposaTxHash,
            votingMachine: addresses.AbsoluteVote.toLowerCase(),
            scheme: accounts[0].address.toLowerCase(),
        });

        let i = 0;
        // get absolute majority for both proposals
        for (i = 0; i < 2; i++) {
            await absVote.methods.vote(
                                      proposalId,
                                      1,
                                      0,
                                      accounts[0].address /* unused by the contract */)
                                      .send({ from: accounts[i].address });
            await absVote.methods.vote(
                                      removeProposalId,
                                      1,
                                      0,
                                      accounts[0].address /* unused by the contract */)
                                      .send({ from: accounts[i].address });
        }

        // pass the proposals
        let { transactionHash: executeTxHash } = await absVote.methods.vote(
                                                                proposalId,
                                                                1,
                                                                0,
                                                                accounts[0].address /* unused by the contract */)
                                                                .send({ from: accounts[i].address });

        let { transactionHash: removeExecuteTxHash } = await absVote.methods.vote(
                                                                removeProposalId,
                                                                1,
                                                                0,
                                                                accounts[0].address /* unused by the contract */)
                                                                .send({ from: accounts[i].address });
        if ((await absVote.methods.proposals(proposalId).call()).organizationId
        !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
          i++;
          executeTxHash = (await absVote.methods.vote(
            proposalId,
            1,
            0,
            accounts[0].address /* unused by the contract */)
            .send({ from: accounts[i].address })).transactionHash;

          removeExecuteTxHash = (await absVote.methods.vote(
            removeProposalId,
            1,
            0,
            accounts[0].address /* unused by the contract */)
            .send({ from: accounts[i].address })).transactionHash;
        }

        const { schemeRegistrarProposalExecuteds } = await sendQuery(`{
            schemeRegistrarProposalExecuteds {
              txHash,
              contract,
              avatar,
              proposalId,
              decision
            }
        }`);

        expect(schemeRegistrarProposalExecuteds).toContainEqual({
          avatar: addresses.Avatar.toLowerCase(),
          contract: schemeRegistrar.options.address.toLowerCase(),
          proposalId,
          txHash: executeTxHash,
          decision: '1',
        });

        expect(schemeRegistrarProposalExecuteds).toContainEqual(
        {avatar: addresses.Avatar.toLowerCase(),
        contract: schemeRegistrar.options.address.toLowerCase(),
        proposalId: removeProposalId,
        txHash: removeExecuteTxHash,
        decision: '1',
        });

        const { schemeRegistrarProposals } = await sendQuery(`{
            schemeRegistrarProposals {
              dao {
                id
              },
              schemeToRegister,
              schemeToRegisterParamsHash,
              schemeToRegisterPermission,
              schemeToRemove,
              decision,
              schemeRegistered,
              schemeRemoved,
              id
            }
        }`);

        expect(schemeRegistrarProposals).toContainEqual({
          dao: { id : addresses.Avatar.toLowerCase() },
          schemeToRegister: accounts[0].address.toLowerCase(),
          schemeToRegisterParamsHash: registerSchemeParamsHash,
          schemeToRegisterPermission: '0x0000001f',
          schemeToRemove: null,
          id: proposalId,
          schemeRegistered: true,
          schemeRemoved: null,
          decision: '1',
        });

        expect(schemeRegistrarProposals).toContainEqual({
          dao: { id : addresses.Avatar.toLowerCase() },
          schemeToRegister: null,
          schemeToRegisterParamsHash: null,
          schemeToRegisterPermission: null,
          schemeToRemove: accounts[0].address.toLowerCase(),
          id: removeProposalId,
          schemeRegistered: null,
          schemeRemoved: true,
          decision: '1',
        });
    }, 100000);
});
