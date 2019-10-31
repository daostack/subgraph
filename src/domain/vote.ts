import { Address, BigInt, crypto, store } from '@graphprotocol/graph-ts';
import { Event, ProposalVote } from '../types/schema';

export function getVote(id: string): ProposalVote {
  let vote = store.get('ProposalVote', id) as ProposalVote;
  if (vote == null) {
    vote = new ProposalVote(id);
  }
  return vote;
}

export function saveVote(vote: ProposalVote): void {
  store.set('ProposalVote', vote.id, vote);
}

export function insertVote(
  eventId: string,
  timestamp: BigInt,
  voter: Address,
  proposalId: string,
  daoId: string,
  outcome: string,
  reputation: BigInt,
): void {
  let vote = getVote(eventId);
  vote.createdAt = timestamp;
  vote.voter = voter;
  vote.reputation = reputation;
  vote.proposal = proposalId;
  vote.dao = daoId;
  vote.outcome = outcome;
  saveVote(vote);

  let eventType = 'Vote';

  let eventEnt = new Event(eventId);
  eventEnt.type = eventType;
  eventEnt.data = '{ "outcome": "' + outcome + '", "reputationAmount": "' + reputation.toString() + '" }';
  eventEnt.proposal = proposalId;
  eventEnt.user = voter;
  eventEnt.dao = daoId;
  eventEnt.timestamp = timestamp;

  eventEnt.save();
}
