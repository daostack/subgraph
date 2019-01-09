import { Address, BigInt, crypto, store } from '@graphprotocol/graph-ts';
import { DAOToken } from '../types/NativeToken/DAOToken';
import { Reputation } from '../types/Reputation/Reputation';
import { Member } from '../types/schema';
import { concat, equals, hexToAddress } from '../utils';
import { decreaseDAOmembersCount, getDAO, increaseDAOmembersCount } from './dao';

export function getMember(address: Address, daoAddress: Address): Member {
  let id = crypto.keccak256(concat(address, daoAddress)).toHex();
  let member = store.get('Member', id) as Member;
  if (member == null) {
    member = new Member(id);
    member.address = address;
    member.dao = daoAddress.toHex();
    member.reputation = BigInt.fromI32(0);
    saveMember(member);
    increaseDAOmembersCount(member.dao);
  }
  return member;
}

export function saveMember(member: Member): void {
  store.set('Member', member.id, member);
}

export function deleteMember(member: Member): void {
  store.remove('Member', member.id);
  decreaseDAOmembersCount(member.dao);
}

export function updateMemberReputation(
  address: Address,
  daoAddress: Address,
): void {
  let dao = getDAO(daoAddress.toHex());
  let reputation = Reputation.bind(hexToAddress(dao.nativeReputation));
  let member = getMember(address, daoAddress);
  member.reputation = reputation.balanceOf(address);
  if (equals(member.reputation as BigInt, BigInt.fromI32(0))) {
    deleteMember(member);
  } else {
    saveMember(member);
  }
}

export function updateMemberReputationWithValue(
  address: Address,
  daoAddress: Address,
  value: BigInt,
): void {
  let member = getMember(address, daoAddress);
  member.reputation = value;
  if (equals(member.reputation as BigInt, BigInt.fromI32(0))) {
    deleteMember(member);
  } else {
    saveMember(member);
  }
}

export function updateMemberTokens(
  address: Address,
  daoAddress: Address,
): void {
  let dao = getDAO(daoAddress.toHex());
  let token = DAOToken.bind(hexToAddress(dao.nativeToken));
  let member = getMember(address, daoAddress);
  member.tokens = token.balanceOf(address);
  saveMember(member);
}
