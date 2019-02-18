import { Address, BigInt, Bytes, crypto, store } from '@graphprotocol/graph-ts';
import { GenesisProtocol } from '../types/GenesisProtocol/GenesisProtocol';
import { Proposal, ProposalVote, Reward } from '../types/schema';
import { concat, equals } from '../utils';
import { updateThreshold } from './dao';
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

    proposal.stage = 'Queued';
    proposal.executionState = 'None';

    proposal.votesFor = BigInt.fromI32(0);
    proposal.votesAgainst = BigInt.fromI32(0);
    proposal.winningOutcome = 'Fail';

    proposal.stakesFor = BigInt.fromI32(0);
    proposal.stakesAgainst = BigInt.fromI32(0);
    proposal.confidence = BigInt.fromI32(0);
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
  proposal.votingMachine = gpAddress;

  // proposal.winningVote
  proposal.winningOutcome = parseOutcome(gpProposal.value3);

  // proposal.state

  let state = gpProposal.value2;
  setProposalState(proposal, state);
  }

export function updateProposalconfidence(id: Bytes, confidence: BigInt): void {
   let proposal = getProposal(id.toHex());
   proposal.confidence = confidence;
   saveProposal(proposal);
}

export function updateProposalState(id: Bytes, state: number, gpAddress: Address): void {
   let gp = GenesisProtocol.bind(gpAddress);
   let proposal = getProposal(id.toHex());
   updateThreshold(proposal.dao, gp.threshold(proposal.paramsHash, proposal.organizationId));
   setProposalState(proposal, state);
   saveProposal(proposal);
}

export function setProposalState(proposal: Proposal, state: number): void {
  // enum ProposalState { None, ExpiredInQueue, Executed, Queued, PreBoosted, Boosted, QuietEndingPeriod}
  if (state === 1) {
    // Closed
    proposal.stage = 'ExpiredInQueue';
  } else if (state === 2) {
    // Executed
    proposal.stage = 'Executed';
  } else if (state === 3) {
    // PreBoosted
    proposal.stage = 'Queued';
  } else if (state === 4) {
    // Boosted
    proposal.stage = 'PreBoosted';
  } else if (state === 5) {
    // QuietEndingPeriod
    proposal.stage = 'Boosted';
  } else if (state === 6) {
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

  proposal.votingMachine = gpAddress;
  proposal.queuedVoteRequiredPercentage = params.value0; // queuedVoteRequiredPercentage
  proposal.queuedVotePeriodLimit = params.value1; // queuedVotePeriodLimit
  proposal.boostedVotePeriodLimit = params.value2; // boostedVotePeriodLimit
  proposal.preBoostedVotePeriodLimit = params.value3; // preBoostedVotePeriodLimit
  proposal.thresholdConst = params.value4; // thresholdConst
  proposal.limitExponentValue = params.value5; // limitExponentValue
  proposal.quietEndingPeriod = params.value6; // quietEndingPeriod
  proposal.proposingRepReward = params.value7;
  proposal.votersReputationLossRatio = params.value8; // votersReputationLossRatio
  proposal.minimumDaoBounty = params.value9; // minimumDaoBounty
  proposal.daoBountyConst = params.value10; // daoBountyConst
  proposal.activationTime = params.value11; // activationTime
  proposal.voteOnBehalf = params.value12; // voteOnBehalf
  proposal.stakesAgainst = gp.proposals(proposalId).value9;
  proposal.confidence = getProposalConfidence(proposal);
  proposal.paramsHash = paramsHash;
  proposal.organizationId = gp.proposals(proposalId).value0;

  saveProposal(proposal);
}

export function getProposalConfidence(proposal: Proposal): BigInt {
  return proposal.stakesFor.div(proposal.stakesAgainst);
}

export function updateCRProposal(
  proposalId: Bytes,
  createdAt: BigInt,
  avatarAddress: Address,
  votingMachine: Address,
  beneficiary: Address,
  descriptionHash: string,
  periodLength: BigInt,
  periods: BigInt,
  reputationReward: BigInt,
  nativeTokenReward: BigInt,
  ethReward: BigInt,
  externalToken: Address,
  externalTokenReward: BigInt,
): void {
  let proposal = getProposal(proposalId.toHex());
  proposal.dao = avatarAddress.toHex();
  proposal.beneficiary = beneficiary;
  proposal.reputationReward = reputationReward;
  proposal.createdAt = createdAt;
  proposal.votingMachine = votingMachine;

  proposal.nativeTokenReward = nativeTokenReward;
  proposal.ethReward = ethReward;
  proposal.externalTokenReward = externalTokenReward;
  proposal.periodLength = periodLength;
  proposal.periods = periods;
  proposal.externalToken = externalToken;
  proposal.descriptionHash = descriptionHash;
  saveProposal(proposal);
}

// export function updateProposalExecution(
//   proposalId: Bytes,
//   timestamp: BigInt,
// ): void {
//   let proposal = getProposal(proposalId.toHex());
//   proposal.executedAt = timestamp;
//   let voters: string[] = proposal.votes as string[];
//   for (let i = 0; i < voters.length; i++) {
//     let proposalVote = store.get('ProposalVote', voters[i]) as ProposalVote;
//     let voterAddress = store.get('Member', proposalVote.member).address;
//     let uniqueId = i.toString();
//     let reward = new Reward(uniqueId);
//     reward.beneficiary = voterAddress;
//     reward.proposal = proposal.id;
//     //reward.reason = ;
//     let genesisProtocol = GenesisProtocol.bind(address);
//     reward.amount = 0;
//     reward.redeemed = 0;
//
//     proposal.rewards.push();
//   }
//
//   saveProposal(proposal);
// }

export function updateProposalExecution(
  proposalId: Bytes,
  totalReputation: BigInt,
  timestamp: BigInt,
): void {
  let proposal = getProposal(proposalId.toHex());
  proposal.executedAt = timestamp;
  if (totalReputation != null) {
    proposal.totalRepWhenExecuted = totalReputation;
  }
  saveProposal(proposal);
}

export function updateProposalExecutionState(id: string, executionState: number): void {
  let proposal = getProposal(id);
  // enum ExecutionState { None, QueueBarCrossed, QueueTimeOut, PreBoostedBarCrossed, BoostedTimeOut, BoostedBarCrossed}
  if (state === 1) {
    proposal.executionState = 'QueueBarCrossed';
  } else if (state === 2) {
    proposal.executionState = 'QueueTimeOut';
  } else if (state === 3) {
    proposal.executionState = 'PreBoostedBarCrossed';
  } else if (state === 4) {
    proposal.executionState = 'BoostedTimeOut';
  } else if (state === 5) {
    proposal.executionState = 'BoostedBarCrossed';
  }
  saveProposal(proposal);
}
