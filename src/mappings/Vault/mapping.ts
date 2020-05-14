import { ReceiveEther, SendEther, Vault } from '../../types/Vault/Vault';
import { handleAvatarBalance } from '../Avatar/mapping';

export function handleReceiveEther(event: ReceiveEther): void {
  let vault = Vault.bind(event.address);
  let avatar = vault.owner();
  handleAvatarBalance(avatar, event.params._value, true);
}

export function handleSendEther(event: SendEther): void {
  let vault = Vault.bind(event.address);
  let avatar = vault.owner();
  handleAvatarBalance(avatar, event.params._value, false);
}
