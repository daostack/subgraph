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

const UpgradeScheme = require('@daostack/migration-experimental/contracts/0.1.1-rc.17/UpgradeScheme.json');
const GenesisProtocol = require('@daostack/migration-experimental/contracts/0.1.1-rc.17/GenesisProtocol.json');

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

      const upgradeScheme = new web3.eth.Contract(
        UpgradeScheme.abi,
        addresses.UpgradeScheme,
        opts,
      );
      const genesisProtocol = new web3.eth.Contract(
        GenesisProtocol.abi,
        addresses.GenesisProtocol,
        opts,
      );

      const descHash =
        '0x000000000000000000000000000000000000000000000000000000000000abcd';

      async function propose() {
        const prop = upgradeScheme.methods.proposeUpgrade(
          getPackageVersion(),
          [web3.utils.fromAscii('Avatar'), web3.utils.fromAscii('Reputation'), web3.utils.fromAscii('DAOToken')],
          [addresses.Avatar.toLowerCase(), addresses.Reputation.toLowerCase(), addresses.DAOToken.toLowerCase()],
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

            upgradeScheme {
              id
              dao {
                 id
              }
              packageVersion
              contractsNames
              contractsToUpgrade
              descriptionHash
              executed
            }
            scheme {
              upgradeSchemeParams {
                arcPackage
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

        upgradeScheme: {
          id: p1,
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          packageVersion: getPackageVersion(),
          contractsNames: [
            web3.utils.fromAscii('Avatar') + '0000000000000000000000000000000000000000000000000000',
            web3.utils.fromAscii('Reputation') + '00000000000000000000000000000000000000000000',
            web3.utils.fromAscii('DAOToken') + '000000000000000000000000000000000000000000000000',
          ],
          contractsToUpgrade: [
            addresses.Avatar.toLowerCase(),
            addresses.Reputation.toLowerCase(),
            addresses.DAOToken.toLowerCase(),
          ],
          descriptionHash: descHash,
          executed: false,
        },
        scheme: {
          upgradeSchemeParams: {
            arcPackage: addresses.Package.toLowerCase(),
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

        upgradeScheme: {
          id: p1,
          dao: {
            id: addresses.Avatar.toLowerCase(),
          },
          packageVersion: getPackageVersion(),
          contractsNames: [
            web3.utils.fromAscii('Avatar') + '0000000000000000000000000000000000000000000000000000',
            web3.utils.fromAscii('Reputation') + '00000000000000000000000000000000000000000000',
            web3.utils.fromAscii('DAOToken') + '000000000000000000000000000000000000000000000000',
          ],
          contractsToUpgrade: [
            addresses.Avatar.toLowerCase(),
            addresses.Reputation.toLowerCase(),
            addresses.DAOToken.toLowerCase(),
          ],
          descriptionHash: descHash,
          executed: true,
        },
      });

      const { contractInfos } = await sendQuery(`{
        contractInfos(where: {id: "${addresses.Avatar.toLowerCase()}"}) {
          id
          name
          version
        }
      }`);

      expect(contractInfos).toContainEqual({
        id: addresses.Avatar.toLowerCase(),
        name: 'Avatar',
        version: getArcVersion(),
      });
    }, 100000);
  });
