import { Address, BigInt, store } from '@graphprotocol/graph-ts';
import { Event, ProposalStake } from '../types/schema';

export function getStake(id: string): ProposalStake {
  let stake = store.get('ProposalStake', id) as ProposalStake;
  if (stake == null) {
    stake = new ProposalStake(id);
  }
  return stake;
}

export function saveStake(stake: ProposalStake): void {
  store.set('ProposalStake', stake.id, stake);
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
  saveStake(stake);

  let eventType = 'Stake';

  let eventEnt = new Event(eventId);
  eventEnt.type = eventType;
  eventEnt.data = '{ "stage": " ' + outcome + ' ", "stakeAmount": " ' + amount.toString() + ' " }';
  eventEnt.proposal = proposalId;
  eventEnt.user = staker;
  eventEnt.dao = daoId;
  eventEnt.timestamp = timestamp;

  eventEnt.save();
}
