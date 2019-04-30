import 'allocator/arena';

import { Address, BigInt, store } from '@graphprotocol/graph-ts';

// Import event types from the Avatar contract ABI
import { Avatar, OwnershipTransferred, ReceiveEther, SendEther } from '../../types/Avatar/Avatar';

// Import entity types generated from the GraphQL schema
import { AvatarContract } from '../../types/schema';

function handleAvatarBalance(
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

  store.set('AvatarContract', avatar.id, avatar);
}

export function handleSendEth(event: SendEther): void {
  handleAvatarBalance(event.address, event.params._amountInWei, false);
}
export function handleReceiveEth(event: ReceiveEther): void {
  handleAvatarBalance(event.address, event.params._value, true);
}
export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let avatar = AvatarContract.load(event.address.toHex());
  if (avatar == null) {
      avatar = new AvatarContract(event.address.toHex());
  }
  avatar.owner = event.params.newOwner;
  avatar.save();
}
