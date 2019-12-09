import 'allocator/arena';

import { BigInt, ByteArray, crypto, ipfs, Address } from '@graphprotocol/graph-ts';
// Import event types from the Reputation contract ABI
import {
  NewCompetitionProposal, NewSuggestion, NewVote, Redeem, SnapshotBlock,
} from '../../types/Competition/Competition';

import { ContributionRewardExt } from '../../types/ContributionRewardExt/ContributionRewardExt';
import { CompetitionProposal, CompetitionSuggestion, CompetitionVote, Proposal } from '../../types/schema';
import { concat, eventId } from '../../utils';

export function handleNewCompetitionProposal(event: NewCompetitionProposal): void {
  let contributionRewardExt = ContributionRewardExt.bind(event.params._contributionRewardExt);
  let avatar = contributionRewardExt.avatar();
  let contributionRewardScheme = crypto.keccak256(concat(avatar, event.params._contributionRewardExt)).toHex()
  let competitionProposal = new CompetitionProposal(event.params._proposalId.toHex());
  competitionProposal.proposal = event.params._proposalId.toHex();
  competitionProposal.contract = event.address;
  competitionProposal.dao = avatar.toHex();
  competitionProposal.numberOfWinners = event.params._numberOfWinners;
  competitionProposal.rewardSplit = event.params._rewardSplit;
  competitionProposal.startTime = event.params._startTime;
  competitionProposal.votingStartTime = event.params._votingStartTime;
  competitionProposal.suggestionsEndTime = event.params._suggestionsEndTime;
  competitionProposal.endTime = event.params._endTime;
  competitionProposal.numberOfVotesPerVoters = event.params._maxNumberOfVotesPerVoter;
  competitionProposal.contributionReward = contributionRewardScheme;
  competitionProposal.createdAt = event.block.timestamp;
  competitionProposal.save();
  let proposal = Proposal.load(competitionProposal.id);
  if (proposal != null) {
    proposal.competition = competitionProposal.id;
    proposal.save();
  }
}

export function handleRedeem(event: Redeem): void {
  // TODO: Implement redeem and reward logic.
}

export function handleNewSuggestion(event: NewSuggestion): void {
  let competitionSuggestion = new CompetitionSuggestion(
    crypto.keccak256(
      concat(
        event.params._proposalId,
        event.params._suggestionId as ByteArray,
      ),
    ).toHex(),
  );
  competitionSuggestion.proposal = event.params._proposalId.toHex();
  competitionSuggestion.descriptionHash = event.params._descriptionHash;
  let ipfsData = ipfs.cat('/ipfs/' + event.params._descriptionHash.toHex());
  if (ipfsData != null) {
    competitionSuggestion.description = ipfsData.toString();
  }
  competitionSuggestion.suggester = event.params._suggester;
  competitionSuggestion.totalVotes = BigInt.fromI32(0);
  competitionSuggestion.createdAt = event.block.timestamp;
  competitionSuggestion.save();
}

export function handleNewVote(event: NewVote): void {
  let suggestionId = crypto.keccak256(
    concat(event.params._proposalId, event.params._suggestionId as ByteArray),
  ).toHex();
  let vote = new CompetitionVote(eventId(event));
  vote.proposal = event.params._proposalId.toHex();
  vote.suggestion = suggestionId;
  vote.voter = event.params._voter;
  vote.createdAt = event.block.timestamp;
  vote.reptutation = event.params._reputation;
  let suggestion = CompetitionSuggestion.load(suggestionId);
  if (suggestion != null) {
    suggestion.totalVotes = suggestion.totalVotes.plus(event.params._reputation);
    suggestion.save();
  }
  vote.save();
}

export function handleSnapshotBlock(event: SnapshotBlock): void {
  let competitionProposal = CompetitionProposal.load(event.params._proposalId.toHex());
  if (competitionProposal != null) {
    competitionProposal.snapshotBlock = event.params._snapshotBlock;
    competitionProposal.save();
  }
}
