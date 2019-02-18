import { Address, BigInt, Entity, store, Value } from '@graphprotocol/graph-ts';
import { DAOToken } from '../types/DAOToken/DAOToken';
import { Reputation } from '../types/Reputation/Reputation';
import { DAO } from '../types/schema';
import { Avatar } from '../types/UController/Avatar';
import { UController } from '../types/UController/UController';

export function getDAO(id: string): DAO {
  let dao = store.get('DAO', id) as DAO;
  if (dao == null) {
    dao = new DAO(id);
  }

  return dao;
}

export function increaseDAOmembersCount(id: string): void {
  let dao = getDAO(id);
  dao.membersCount = dao.membersCount.plus(BigInt.fromI32(1));
  saveDAO(dao);
}

export function decreaseDAOmembersCount(id: string): void {
  let dao = getDAO(id);
  dao.membersCount = dao.membersCount.minus(BigInt.fromI32(1));
  saveDAO(dao);
}

export function updateThreshold(id: string, threshold: BigInt): void {
  let dao = getDAO(id);
  dao.threshold = threshold;
  saveDAO(dao);
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
  dao.membersCount = BigInt.fromI32(0);
  // 0x10000000000
  dao.threshold =  BigInt.fromI32(1073741824).times(BigInt.fromI32(1024));
  saveDAO(dao);

  return dao;
}
