import { Address, BigInt, store } from '@graphprotocol/graph-ts';
import { ProposalStake } from '../types/schema';
import { save } from '../utils';
import { addStakeEvent } from './event';

export function getStake(id: string): ProposalStake {
  let stake = store.get('ProposalStake', id) as ProposalStake;
  if (stake == null) {
    stake = new ProposalStake(id);
  }
  return stake;
}

export function saveStake(stake: ProposalStake, timestamp: BigInt): void {
  save(stake, 'ProposalStake', timestamp);
}

export function insertStake(
  eventId: string,
  timestamp: BigInt,
  staker: Address,
  amount: BigInt,
  proposalId: string,
  daoId: string,
  outcome: string,
): void {
  let stake = getStake(eventId);
  stake.createdAt = timestamp;
  stake.staker = staker;
  stake.amount = amount;
  stake.proposal = proposalId;
  stake.dao = daoId;
  stake.outcome = outcome;
  saveStake(stake, timestamp);

  addStakeEvent(eventId, proposalId, outcome, amount, staker, daoId, timestamp);
}
