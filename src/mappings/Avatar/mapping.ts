import 'allocator/arena';

import { Address, BigInt, store } from '@graphprotocol/graph-ts';

// Import event types from the Avatar contract ABI
import { Avatar, OwnershipTransferred, ReceiveEther, SendEther } from '../../types/Avatar/Avatar';

// Import entity types generated from the GraphQL schema
import { AvatarContract } from '../../types/schema';

function getAvatar(id: string): AvatarContract {
  let avatar = store.get('AvatarContract', id) as AvatarContract;
  if (avatar == null) {
    const avatarAddress = Address.fromString(id);
    avatar = new AvatarContract(id);
    avatar.address = avatarAddress;

    let avatarSC = Avatar.bind(avatarAddress);
    avatar.name = avatarSC.orgName();
    avatar.nativeReputation = avatarSC.nativeReputation();
    avatar.nativeToken = avatarSC.nativeToken();
    avatar.balance = BigInt.fromI32(0);
  }
  return avatar;
}

function saveAvatar(avatar: AvatarContract): void {
  store.set('AvatarContract', avatar.id, avatar);
}

function handleAvatarBalance(
  address: Address,
  value: BigInt,
  received: boolean,
): void {
  let avatar = getAvatar(address.toHex());

  if (received) {
    avatar.balance = avatar.balance.plus(value);
  } else {
    avatar.balance = avatar.balance.minus(value);
  }

  saveAvatar(avatar);
}

export function handleSendEth(event: SendEther): void {
  handleAvatarBalance(event.address, event.params._amountInWei, false);
}

export function handleReceiveEth(event: ReceiveEther): void {
  handleAvatarBalance(event.address, event.params._value, true);
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let avatar = getAvatar(event.address.toHex());
  avatar.owner = event.params.newOwner;
  saveAvatar(avatar);
}
