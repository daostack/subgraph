import { getArcVersion, getContractAddresses, sendQuery } from './util';

describe('ContractsInfo', () => {
  let addresses;

  beforeAll(async () => {
    addresses = getContractAddresses();
  });

  it('Sanity', async () => {

    const { contractInfos } = await sendQuery(`{
      contractInfos(where: {address: "${addresses.GenesisProtocol.toLowerCase()}"}) {
        name
      }
    }`);

    expect(contractInfos).toContainEqual({
      name: 'GenesisProtocol',
    });

    const { universalContractInfos } = await sendQuery(`{
      universalContractInfos(where: {name: "GenesisProtocol"}) {
        name
        address
        version
      }
    }`);

    expect(universalContractInfos).toContainEqual({
      name: 'GenesisProtocol',
      address: addresses.GenesisProtocolV0.toLowerCase(),
      version: '0.1.2-rc.0',
    });

    expect(universalContractInfos).toContainEqual({
      name: 'GenesisProtocol',
      address: addresses.GenesisProtocolV1.toLowerCase(),
      version: '0.1.2-rc.1',
    });

    expect(universalContractInfos).toContainEqual({
      name: 'GenesisProtocol',
      address: addresses.GenesisProtocol.toLowerCase(),
      version: getArcVersion(),
    });

    let universalContractInfos = (await sendQuery(`{
      universalContractInfos(where: {name: "GenesisProtocol"}) {
        name
        address
        version
      }
    }`)).universalContractInfos;

    expect(universalContractInfos).toContainEqual({
      name: 'GenesisProtocol',
      address: addresses.GenesisProtocolV0.toLowerCase(),
      version: '0.1.2-rc.0',
    });

    expect(universalContractInfos).toContainEqual({
      name: 'GenesisProtocol',
      address: addresses.GenesisProtocolV1.toLowerCase(),
      version: '0.1.2-rc.1',
    });

    expect(universalContractInfos).toContainEqual({
      name: 'GenesisProtocol',
      address: addresses.GenesisProtocol.toLowerCase(),
      version: getArcVersion(),
    });

    universalContractInfos = (await sendQuery(`{
      universalContractInfos(where: {name: "DAORegistryInstance"}) {
        name
        address
        version
      }
    }`)).universalContractInfos;

    expect(universalContractInfos).toContainEqual({
      name: 'DAORegistryInstance',
      address: addresses.DAORegistryInstanceV0.toLowerCase(),
      version: '0.1.2-rc.0',
    });

    expect(universalContractInfos).toContainEqual({
      name: 'DAORegistryInstance',
      address: addresses.DAORegistryInstanceV1.toLowerCase(),
      version: '0.1.2-rc.1',
    });

    expect(universalContractInfos).toContainEqual({
      name: 'DAORegistryInstance',
      address: addresses.DAORegistryInstance.toLowerCase(),
      version: getArcVersion(),
    });

    universalContractInfos = (await sendQuery(`{
      universalContractInfos(where: {name: "DAOFactoryInstance"}) {
        name
        address
        version
      }
    }`)).universalContractInfos;

    expect(universalContractInfos).toContainEqual({
      name: 'DAOFactoryInstance',
      address: addresses.DAOFactoryInstanceV0.toLowerCase(),
      version: '0.1.2-rc.0',
    });

    expect(universalContractInfos).toContainEqual({
      name: 'DAOFactoryInstance',
      address: addresses.DAOFactoryInstanceV1.toLowerCase(),
      version: '0.1.2-rc.1',
    });

    expect(universalContractInfos).toContainEqual({
      name: 'DAOFactoryInstance',
      address: addresses.DAOFactoryInstance.toLowerCase(),
      version: getArcVersion(),
    });
  }, 20000);
});
