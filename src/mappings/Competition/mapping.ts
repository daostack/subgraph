import { BigInt, ByteArray, Bytes, crypto } from '@graphprotocol/graph-ts';
import {
  NewCompetitionProposal, NewSuggestion, NewVote, Redeem, SnapshotBlock,
} from '../../types/Competition/Competition';

import { getIPFSData } from '../../domain/proposal';
import { ContributionRewardExt } from '../../types/ContributionRewardExt/ContributionRewardExt';
import { CompetitionProposal, CompetitionSuggestion, CompetitionVote, Proposal, Tag } from '../../types/schema';
import { concat, eventId } from '../../utils';

export function handleNewCompetitionProposal(event: NewCompetitionProposal): void {
  let contributionRewardExt = ContributionRewardExt.bind(event.params._contributionRewardExt);
  let avatar = contributionRewardExt.avatar();
  let contributionRewardScheme = crypto.keccak256(concat(avatar, event.params._contributionRewardExt)).toHex();
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
  let competitionProposal = CompetitionProposal.load(event.params._proposalId.toHex());
  if (competitionProposal != null) {
    let suggestionId = crypto.keccak256(
      concat(
        Bytes.fromHexString(competitionProposal.contributionReward),
        event.params._suggestionId as ByteArray,
      ),
    ).toHex();
    let suggestion = CompetitionSuggestion.load(suggestionId);
    if (suggestion != null) {
      suggestion.redeemedAt = event.block.timestamp;
      suggestion.rewardPercentage = event.params._rewardPercentage;
      suggestion.save();
    }
  }
}

export function handleNewSuggestion(event: NewSuggestion): void {
  let competitionProposal = CompetitionProposal.load(event.params._proposalId.toHex());
  if (competitionProposal != null) {
    let competitionSuggestion = new CompetitionSuggestion(
      crypto.keccak256(
        concat(
          Bytes.fromHexString(competitionProposal.contributionReward),
          event.params._suggestionId as ByteArray,
        ),
      ).toHex(),
    );
    competitionSuggestion.suggestionId = event.params._suggestionId;
    competitionSuggestion.proposal = event.params._proposalId.toHex();
    competitionSuggestion.descriptionHash = event.params._descriptionHash;
    competitionSuggestion.suggester = event.params._suggester;
    competitionSuggestion.totalVotes = BigInt.fromI32(0);
    competitionSuggestion.createdAt = event.block.timestamp;

    let data = getIPFSData(competitionSuggestion.descriptionHash);
    competitionSuggestion.title = data.title;
    competitionSuggestion.description = data.description;
    competitionSuggestion.url = data.url;
    competitionSuggestion.fulltext = data.fulltext;

    competitionSuggestion.save();
  }
}

export function handleNewVote(event: NewVote): void {
  let competitionProposal = CompetitionProposal.load(event.params._proposalId.toHex());
  if (competitionProposal != null) {
    let suggestionId = crypto.keccak256(
      concat(
        Bytes.fromHexString(competitionProposal.contributionReward),
        event.params._suggestionId as ByteArray,
      ),
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
}

export function handleSnapshotBlock(event: SnapshotBlock): void {
  let competitionProposal = CompetitionProposal.load(event.params._proposalId.toHex());
  if (competitionProposal != null) {
    competitionProposal.snapshotBlock = event.params._snapshotBlock;
    competitionProposal.save();
  }
}
