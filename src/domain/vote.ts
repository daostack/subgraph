import { Address, BigInt, crypto, store } from '@graphprotocol/graph-ts';
import { ProposalVote } from '../types/schema';
import { save } from '../utils';
import { addVoteEvent } from './event';

export function getVote(id: string): ProposalVote {
  let vote = store.get('ProposalVote', id) as ProposalVote;
  if (vote == null) {
    vote = new ProposalVote(id);
  }
  return vote;
}

export function saveVote(vote: ProposalVote, timestamp: BigInt): void {
  save(vote, 'ProposalVote', timestamp);
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
  saveVote(vote, timestamp);

  addVoteEvent(eventId, proposalId, outcome, reputation, voter, daoId, timestamp);
}
