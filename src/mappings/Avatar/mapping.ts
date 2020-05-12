import 'allocator/arena';

import { Address, BigInt, store } from '@graphprotocol/graph-ts';

// Import event types from the Avatar contract ABI
import { Avatar, MetaData, OwnershipTransferred } from '../../types/Avatar/Avatar';

// Import entity types generated from the GraphQL schema
import { AvatarContract } from '../../types/schema';

import * as domain from '../../domain';
import { save } from '../../utils';

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
  save(avatar as AvatarContract, 'AvatarContract', event.block.timestamp);
}

export function handleMetaData(event: MetaData): void {
  let avatar = AvatarContract.load(event.address.toHex());
  if (avatar != null) {
      avatar.metadataHash = event.params._metaData;
      save(avatar as AvatarContract, 'AvatarContract', event.block.timestamp);
  }
  domain.setDaoMetadata(event);
}
