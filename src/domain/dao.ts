import { Address, Entity, store, Value } from '@graphprotocol/graph-ts';
import { Reputation } from '../types/NativeReputation/Reputation';
import { DAOToken } from '../types/NativeToken/DAOToken';
import { DAO } from '../types/schema';
import { Avatar } from '../types/UController/Avatar';
import { UController } from '../types/UController/UController';

export function getDAO(id: string): DAO {
  let dao = store.get('DAO', id) as DAO;
  if (dao == null) {
    dao = new DAO();
    dao.id = id;
  }

  return dao;
}

export function saveDAO(dao: DAO): void {
  store.set('DAO', dao.id, dao);
}

export function insertNewDAO(
  uControllerAddress: Address,
  avatarAddress: Address,
): DAO {
  let uController = UController.bind(uControllerAddress);
  let org = uController.organizations(avatarAddress);
  let nativeTokenAddress = org.value0;
  let nativeReputationAddress = org.value1;

  let avatar = Avatar.bind(avatarAddress);
  let dao = getDAO(avatarAddress.toHex());
  dao.name = avatar.orgName().toString();
  dao.nativeToken = nativeTokenAddress.toHex();
  dao.nativeReputation = nativeReputationAddress.toHex();
  saveDAO(dao);

  // Save reputaion => DAO mapping so we can use it later
  let rep = new Entity();
  rep.set('id', Value.fromString(dao.nativeReputation));
  rep.set('dao', Value.fromBytes(avatarAddress));
  store.set('NativeReputation2DAO', dao.nativeReputation, rep);

  // Save token => DAO mapping so we can use it later
  let tok = new Entity();
  tok.set('id', Value.fromString(dao.nativeToken));
  tok.set('dao', Value.fromBytes(avatarAddress));
  store.set('NativeToken2DAO', dao.nativeToken, tok);

  return dao;
}

export function getDAOByNativeReputationAddress(
  reputationAddress: Address,
): Address | null {
  let ent = store.get('NativeReputation2DAO', reputationAddress.toHex());
  if (ent == null) {
    return null;
  } else {
    return ent.get('dao').toAddress();
  }
}

export function getDAOByNativeTokenAddress(
  tokenAddress: Address,
): Address | null {
  let ent = store.get('NativeToken2DAO', tokenAddress.toHex());
  if (ent == null) {
    return null;
  } else {
    return ent.get('dao').toAddress();
  }
}
