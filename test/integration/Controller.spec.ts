import {
  getContractAddresses,
  getOptions,
  getWeb3,
  hashLength,
  nullParamsHash,
  padZeros,
  sendQuery,
} from './util';

const Avatar = require('@daostack/arc/build/contracts/Avatar.json');
const DAOToken = require('@daostack/arc/build/contracts/DAOToken.json');
const Reputation = require('@daostack/arc/build/contracts/Reputation.json');
const TokenCapGC = require('@daostack/arc/build/contracts/TokenCapGC.json');
const Controller = require('@daostack/arc/build/contracts/Controller.json');

function getControllerDAOAddresses() {
  const controllerDao = require(`../../daos/testdao.json`);
  return {
    Controller: controllerDao.Controller,
    controllerAvatar: controllerDao.Avatar,
    ControllerReputation: controllerDao.Reputation,
    ControllerToken: controllerDao.DAOToken,
  };
}

describe('Controller', () => {
  let addresses;
  beforeAll(async () => {
    addresses = getControllerDAOAddresses();
  });

  it('Sanity', async () => {
    const getMigrationDao = `{
      dao(id: "${addresses.controllerAvatar.toLowerCase()}") {
        id
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
      id: addresses.controllerAvatar.toLowerCase(),
      nativeToken: {
        id: addresses.ControllerToken.toLowerCase(),
        dao: {
          id: addresses.controllerAvatar.toLowerCase(),
        },
      },
      nativeReputation: {
        id: addresses.ControllerReputation.toLowerCase(),
        dao: {
          id: addresses.controllerAvatar.toLowerCase(),
        },
      },
    });
  }, 20000);
});
