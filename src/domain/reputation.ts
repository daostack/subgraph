import { Address, store } from '@graphprotocol/graph-ts';
import { Rep } from '../types/schema';
import { getRepSupply } from '../utils';

export function getReputation(id: string): Rep {
  let reputation = store.get('Rep', id) as Rep;
  if (reputation == null) {
    reputation = new Rep(id);
  }

  return reputation;
}

export function saveReputation(reputation: Rep): void {
  store.set('Rep', reputation.id, reputation);
}

export function insertReputation(
  reputationAddress: Address,
  daoId: string,
): void {
  let reputation = getReputation(reputationAddress.toHex());
  reputation.dao = daoId;
  reputation.totalSupply = getRepSupply(reputationAddress);
  saveReputation(reputation);
}

export function updateReputationTotalSupply(reputationAddress: Address): void {
  let reputation = getReputation(reputationAddress.toHex());
  reputation.totalSupply = getRepSupply(reputationAddress);
  saveReputation(reputation);
}
