import {
  sendQuery, getContractAddresses,
} from './util';

describe('Controller', () => {
  let addresses;
  beforeAll(async () => {
    addresses = getContractAddresses();
  });

  it('Sanity', async () => {
    const getMigrationDao = `{
      dao(id: "${addresses.Avatar.toLowerCase()}") {
        id
        name
        nativeToken {
          id
          dao {
            id
          }
        }
        nativeReputation {
          id
          dao {
            id
          }
        }
      }
    }`;
    let dao = (await sendQuery(getMigrationDao)).dao;
    expect(dao).toMatchObject({
      id: addresses.Avatar.toLowerCase(),
      name: addresses.name,
      nativeToken: {
        id: addresses.DAOToken.toLowerCase(),
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
      },
      nativeReputation: {
        id: addresses.Reputation.toLowerCase(),
        dao: {
          id: addresses.Avatar.toLowerCase(),
        },
      },
    });
  }, 20000);
});
