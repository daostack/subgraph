import { Address, BigInt, Entity, store, Value } from '@graphprotocol/graph-ts';
import { DAOToken } from '../types/DAOToken/DAOToken';
import { Reputation } from '../types/Reputation/Reputation';
import { DAO , GPQueue } from '../types/schema';
import { Avatar } from '../types/UController/Avatar';
import { UController } from '../types/UController/UController';
import { getMember } from './member';

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

export function saveDAO(dao: DAO): void {
  store.set('DAO', dao.id, dao);
}

export function insertNewDAO(
  avatarAddress: Address,
  nativeTokenAddress: Address,
  nativeReputationAddress: Address,
): DAO {
  let avatar = Avatar.bind(avatarAddress);
  let dao = getDAO(avatarAddress.toHex());
  dao.name = avatar.orgName().toString();
  dao.nativeToken = nativeTokenAddress.toHex();
  dao.nativeReputation = nativeReputationAddress.toHex();
  dao.membersCount = BigInt.fromI32(0);
  dao.register = 'na';
  saveDAO(dao);
  // add the avatar as a member so we can track its balance
  getMember(avatarAddress, avatarAddress);
  decreaseDAOmembersCount(avatarAddress.toHex());

  return dao;
}

export function register(
  avatar: Address,
  tag: string,
): void {
  let dao = DAO.load(avatar.toHex());
  if (dao != null) {
    dao.register = tag;
    dao.save();
  }
}
