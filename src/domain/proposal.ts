import { Address, BigInt, Bytes, crypto, store } from '@graphprotocol/graph-ts';
import { GenesisProtocol } from '../types/GenesisProtocol/GenesisProtocol';
import { Proposal } from '../types/schema';
import { concat, equals } from '../utils';
import { getMember } from './member';

export function parseOutcome(num: BigInt): string {
  if (equals(num, BigInt.fromI32(1))) {
    // Yes
    return 'Pass';
  } else {
    // No
    return 'Fail';
  }
}

export function getProposal(id: string): Proposal {
  let proposal = store.get('Proposal', id) as Proposal;
  if (proposal == null) {
    proposal = new Proposal(id);

    proposal.stage = 'Open';

    proposal.votesFor = BigInt.fromI32(0);
    proposal.votesAgainst = BigInt.fromI32(0);
    proposal.winningOutcome = 'Fail';

    proposal.stakesFor = BigInt.fromI32(0);
    proposal.stakesAgainst = BigInt.fromI32(0);
  }

  return proposal;
}

export function saveProposal(proposal: Proposal): void {
  store.set('Proposal', proposal.id, proposal);
}

export function updateProposal(
  proposal: Proposal,
  gpAddress: Address,
  proposalId: Bytes,
): void {
  let gp = GenesisProtocol.bind(gpAddress);
  let gpProposal = gp.proposals(proposalId);
  let gpTimes = gp.getProposalTimes(proposalId);

  // proposal.boostedPhaseTime
  if (!equals(gpTimes[1], BigInt.fromI32(0))) {
    if (proposal.boostedAt == null) {
      proposal.boostedAt = gpTimes[1];
    } else if (!equals(proposal.boostedAt as BigInt, gpTimes[1])) {
      proposal.quietEndingPeriodBeganAt = gpTimes[1];
    }
  }

  // proposal.winningVote
  proposal.winningOutcome = parseOutcome(gpProposal.value3);

  // proposal.state
  let state = gpProposal.value2;
  if (state === 1) {
    // Closed
    proposal.stage = 'Resolved';
  } else if (state === 2) {
    // Executed
    proposal.stage = 'Resolved';
  } else if (state === 3) {
    // PreBoosted
    proposal.stage = 'Open';
  } else if (state === 4) {
    // Boosted
    proposal.stage = 'Boosted';
  } else if (state === 5) {
    // QuietEndingPeriod
    proposal.stage = 'QuietEndingPeriod';
  }
}

export function updateGPProposal(
  gpAddress: Address,
  proposalId: Bytes,
  proposer: Address,
  avatarAddress: Address,
  paramsHash: Bytes,
): void {
  let gp = GenesisProtocol.bind(gpAddress);
  let proposal = getProposal(proposalId.toHex());
  proposal.proposer = proposer;
  proposal.dao = avatarAddress.toHex();
  let params = gp.parameters(paramsHash);

  proposal.queuedVoteRequiredPercentage = params.value0; // preBoostedVoteRequiredPercentage
  proposal.queuedVotePeriodLimit = params.value1; // preBoostedVotePeriodLimit
  proposal.boostedVotePeriodLimit = params.value2; // boostedVotePeriodLimit
  proposal.preBoostedVotePeriodLimit = params.value3; // thresholdConstA
  proposal.thresholdConst = params.value4; // thresholdConstB
  proposal.limitExponentValue = params.value5; // minimumStakingFee
  proposal.quietEndingPeriod = params.value6; // quietEndingPeriod
  proposal.proposingRepReward = params.value7; // proposingRepRewardConstA
  proposal.minimumStakingFee = params.value8; // proposingRepRewardConstB
  proposal.minimumDaoBounty = params.value9; // stakerFeeRatioForVoters
  proposal.daoBountyConst = params.value10; // votersReputationLossRatio
  proposal.activationTime = params.value11; // votersGainRepRatioFromLostRep
  proposal.voteOnBehalf = params.value12; // address voteOnBehalf

  saveProposal(proposal);
}

export function updateCRProposal(
  proposalId: Bytes,
  createdAt: BigInt,
  avatarAddress: Address,
  beneficiary: Address,
  ipfsHash: Bytes,
  periodLength: BigInt,
  periods: BigInt,
  reputationReward: BigInt,
  tokensReward: BigInt,
  ethReward: BigInt,
  externalToken: Address,
  externalTokenReward: BigInt,
): void {
  let proposal = getProposal(proposalId.toHex());
  proposal.dao = avatarAddress.toHex();
  proposal.beneficiary = beneficiary;
  proposal.reputationReward = reputationReward;
  proposal.createdAt = createdAt;

  proposal.tokensReward = tokensReward;
  proposal.ethReward = ethReward;
  proposal.externalTokenReward = externalTokenReward;
  proposal.periodLength = periodLength;
  proposal.periods = periods;
  proposal.externalToken = externalToken;
  proposal.ipfsHash = ipfsHash;
  saveProposal(proposal);
}

export function updateProposalExecution(
  proposalId: Bytes,
  timestamp: BigInt,
): void {
  let proposal = getProposal(proposalId.toHex());
  proposal.executedAt = timestamp;
  saveProposal(proposal);
}
