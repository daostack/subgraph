import 'allocator/arena';

import { Address, BigInt, store } from '@graphprotocol/graph-ts';

// Import event types from the Avatar contract ABI
import { Avatar, MetaData, OwnershipTransferred } from '../../types/Avatar/Avatar';

// Import entity types generated from the GraphQL schema
import { AvatarContract } from '../../types/schema';

import * as domain from '../../domain';
import { getDAO } from '../../domain/dao';

export function handleAvatarBalance(
  address: Address,
  value: BigInt,
  received: boolean,
): void {
  let avatar = store.get('AvatarContract', address.toHex()) as AvatarContract;
  if (avatar == null) {
     return;
  }

  if (received) {
    avatar.balance = avatar.balance.plus(value);
  } else {
    avatar.balance = avatar.balance.minus(value);
  }

  avatar.save();

  let dao = getDAO(address.toHex());
  dao.ethBalance = avatar.balance;
  dao.save();
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let avatar = AvatarContract.load(event.address.toHex());
  if (avatar == null) {
    avatar = new AvatarContract(event.address.toHex());
    let avatarSC = Avatar.bind(event.address);
    avatar.address = event.address;
    avatar.name = avatarSC.orgName();
    avatar.nativeReputation = avatarSC.nativeReputation();
    avatar.nativeToken = avatarSC.nativeToken();
    avatar.balance = BigInt.fromI32(0);
    avatar.metadataHash = '';
  }
  avatar.owner = event.params.newOwner;
  avatar.save();
}

export function handleMetaData(event: MetaData): void {
  let avatar = AvatarContract.load(event.address.toHex());
  if (avatar != null) {
      avatar.metadataHash = event.params._metaData;
      avatar.save();
  }
  domain.setDaoMetadata(event);
}
