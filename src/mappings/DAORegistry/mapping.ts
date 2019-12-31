import { Propose, Register, UnRegister } from '../../types/DAORegistry/DAORegistry';

import { daoRegister } from '../../domain';

export function handlePropose(event: Propose): void {
  daoRegister(event.params._avatar, 'proposed');
}

export function handleRegister(event: Register): void {
  daoRegister(event.params._avatar, 'registered');
}

export function handleUnRegister(event: UnRegister): void {
  daoRegister(event.params._avatar, 'unRegistered');
}
