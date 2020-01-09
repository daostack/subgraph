import { BigInt, ByteArray, Bytes, crypto } from '@graphprotocol/graph-ts';
import {
  Competition, NewCompetitionProposal, NewSuggestion, NewVote, Redeem, SnapshotBlock,
} from '../../types/Competition/Competition';

import { getIPFSData } from '../../domain/proposal';
import { ContributionRewardExt } from '../../types/ContributionRewardExt/ContributionRewardExt';
import { CompetitionProposal, CompetitionSuggestion, CompetitionVote, Proposal, Tag } from '../../types/schema';
import { concat, eventId, debug, equalStrings } from '../../utils';

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
  competitionProposal.suggestions = [];
  competitionProposal.winningSuggestions = [];
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

    getSuggestionIPFSData(competitionSuggestion)

    competitionSuggestion.save();

    let competitionSuggestions = competitionProposal.suggestions;
    competitionSuggestions.push(competitionSuggestion.id);
    competitionProposal.suggestions = competitionSuggestions;
    competitionProposal.save();
  }
}

export function getSuggestionIPFSData(suggestion: CompetitionSuggestion): CompetitionSuggestion {
  // IPFS reading
  if (!equalStrings(suggestion.descriptionHash, '') && equalStrings(suggestion.title, '')) {
    let data = getIPFSData(suggestion.descriptionHash);
    suggestion.title = data.title;
    suggestion.description = data.description;
    suggestion.url = data.url;
    suggestion.fulltext = data.fulltext;
    let tagsObjects = data.tags;
    if (tagsObjects.length > 0) {
      let tags: string[] = [];
      let tagsLength = tagsObjects.length < 100 ? tagsObjects.length : 100;
      for (let i = 0; i < tagsLength; i++) {
        if (tags.indexOf(tagsObjects[i].toString()) === -1) {
          tags.push(tagsObjects[i].toString());
          let tagEnt = Tag.load(tagsObjects[i].toString());
          if (tagEnt == null) {
            tagEnt = new Tag(tagsObjects[i].toString());
            tagEnt.numberOfProposals = BigInt.fromI32(0);
            tagEnt.proposals = [];
            tagEnt.numberOfSuggestions = BigInt.fromI32(0);
            tagEnt.competitionSuggestions = [];
          }
          let tagSuggestions = tagEnt.competitionSuggestions;
          tagSuggestions.push(suggestion.id);
          tagEnt.competitionSuggestions = tagSuggestions;
          tagEnt.numberOfSuggestions = tagEnt.numberOfSuggestions.plus(BigInt.fromI32(1));
          tagEnt.save();
        }
      }
      suggestion.tags = tags;
    }
  }
  return suggestion;
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
    vote.reputation = event.params._reputation;
    let suggestion = CompetitionSuggestion.load(suggestionId);
    if (suggestion != null) {
      suggestion.totalVotes = suggestion.totalVotes.plus(event.params._reputation);
      suggestion.save();
    }
    vote.save();

    let competition = Competition.bind(event.address);
    competitionProposal.winningSuggestions = [];
    let winningSuggestions = competitionProposal.winningSuggestions;
    debug(competitionProposal.suggestions.toString() + '')
    for (let i = 0; i < competitionProposal.suggestions.length; i++) {
      let suggestions = competitionProposal.suggestions;
      if (suggestions != null) {
        let currentSuggestionId = (suggestions as Array<string>)[i]
        let competitionSuggestion = CompetitionSuggestion.load(currentSuggestionId as string);
        if (competitionSuggestion != null) {
          let index = competition.getOrderedIndexOfSuggestion(competitionSuggestion.suggestionId);
          if (index >= competitionProposal.numberOfWinners || competitionSuggestion.totalVotes.equals(BigInt.fromI32(0))) {
            competitionSuggestion.positionInWinnerList = null;
          } else {
            competitionSuggestion.positionInWinnerList = index;
            winningSuggestions.push(currentSuggestionId as string);
          }
          competitionSuggestion.save();
        }
      }
    }
    competitionProposal.winningSuggestions = winningSuggestions;
    competitionProposal.save();
  }
}

export function handleSnapshotBlock(event: SnapshotBlock): void {
  let competitionProposal = CompetitionProposal.load(event.params._proposalId.toHex());
  if (competitionProposal != null) {
    competitionProposal.snapshotBlock = event.params._snapshotBlock;
    competitionProposal.save();
  }
}
