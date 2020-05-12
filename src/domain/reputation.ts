import { Address, BigInt, store } from '@graphprotocol/graph-ts';
import { Reputation } from '../types/Reputation/Reputation';
import { Rep } from '../types/schema';
import { save } from '../utils';

export function getReputation(id: string): Rep {
  let reputation = store.get('Rep', id) as Rep;
  if (reputation == null) {
    reputation = new Rep(id);
  }

  return reputation;
}

export function saveReputation(reputation: Rep, timestamp: BigInt): void {
  save(reputation, 'Rep', timestamp);
}

export function insertReputation(
  reputationAddress: Address,
  daoId: string,
  timestamp: BigInt,
): void {
  let rep = Reputation.bind(reputationAddress);
  let reputation = getReputation(reputationAddress.toHex());
  reputation.dao = daoId;
  reputation.totalSupply = rep.totalSupply();
  saveReputation(reputation, timestamp);
}

export function updateReputationTotalSupply(reputationAddress: Address, timestamp: BigInt): void {
  let rep = Reputation.bind(reputationAddress);
  let reputation = getReputation(reputationAddress.toHex());
  reputation.totalSupply = rep.totalSupply();
  saveReputation(reputation, timestamp);
}
