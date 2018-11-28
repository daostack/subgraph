import { Address, store } from '@graphprotocol/graph-ts';
import { Reputation } from '../types/Reputation/Reputation';
import { ReputationContract } from '../types/schema';

export function getReputation(id: string): ReputationContract {
  let reputation = store.get('ReputationContract', id) as ReputationContract;
  if (reputation == null) {
    reputation = new ReputationContract();
    reputation.id = id;
  }

  return reputation;
}

export function saveReputation(reputation: ReputationContract): void {
  store.set('ReputationContract', reputation.id, reputation);
}

export function insertReputation(
  reputationAddress: Address,
  daoId: string,
): void {
  let rep = Reputation.bind(reputationAddress);
  let reputation = getReputation(reputationAddress.toHex());
  reputation.dao = daoId;
  reputation.totalSupply = rep.totalSupply();
  saveReputation(reputation);
}

export function updateReputationTotalSupply(reputationAddress: Address): void {
  let rep = Reputation.bind(reputationAddress);
  let reputation = getReputation(reputationAddress.toHex());
  reputation.totalSupply = rep.totalSupply();
  saveReputation(reputation);
}
