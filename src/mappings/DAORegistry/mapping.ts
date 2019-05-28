import 'allocator/arena';

import { Address, BigInt, store } from '@graphprotocol/graph-ts';

// Import event types from the Token contract ABI
import { Propose, Register, UnRegister } from '../../types/DAORegistry/DAORegistry';

import { Avatar } from '../../types/DAORegistry/templates';

import * as domain from '../../domain';

export function handlePropose(event: Propose): void {
  // Start tracking the new avatar template if we aren't already
  // Warning: This is still very WIP. Refer to this thread for more info:
  // https://github.com/daostack/subgraph/issues/197
  if (store.get("AvatarContract", event.params._avatar.toHex()) == null) {
    Avatar.create(event.params._avatar);
  }

  domain.daoRegister(event.params._avatar, 'proposed');
}

export function handleRegister(event: Register): void {
  domain.daoRegister(event.params._avatar, 'registered');
}

export function handleUnRegister(event: UnRegister): void {
  domain.daoRegister(event.params._avatar, 'unRegistered');
}
