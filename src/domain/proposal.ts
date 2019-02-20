import { Address, BigInt, Bytes, crypto, store } from '@graphprotocol/graph-ts';
import { GenesisProtocol } from '../types/GenesisProtocol/GenesisProtocol';
import { Proposal } from '../types/schema';
import { equals } from '../utils';
import { updateThreshold } from './dao';

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
    proposal.confidenceThreshold = BigInt.fromI32(0);
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
  proposal.votingMachine = gpAddress;
  // proposal.winningVote
  proposal.winningOutcome = parseOutcome(gpProposal.value3);
  }

export function updateProposalconfidence(id: Bytes, confidence: BigInt): void {
   let proposal = getProposal(id.toHex());
   proposal.confidenceThreshold = confidence;
   saveProposal(proposal);
}

export function updateProposalState(id: Bytes, state: number, gpAddress: Address): void {
   let gp = GenesisProtocol.bind(gpAddress);
   let proposal = getProposal(id.toHex());
   updateThreshold(proposal.dao, gp.threshold(proposal.paramsHash, proposal.organizationId));
   setProposalState(proposal, state, gp.getProposalTimes(id));
   if (state === 4) {
     proposal.confidenceThreshold = gp.proposals(id).value10;
   }
   saveProposal(proposal);
}

export function setProposalState(proposal: Proposal, state: number, gpTimes: BigInt[]): void {
  // enum ProposalState { None, ExpiredInQueue, Executed, Queued, PreBoosted, Boosted, QuietEndingPeriod}
  if (state === 1) {
    // Closed
    proposal.stage = 'ExpiredInQueue';
  } else if (state === 2) {
    // Executed
    proposal.stage = 'Executed';
  } else if (state === 3) {
    // Queued
    proposal.stage = 'Queued';
  } else if (state === 4) {
    // PreBoosted
    proposal.stage = 'PreBoosted';
    proposal.preBoostedAt = gpTimes[2];
  } else if (state === 5) {
    // Boosted
    proposal.boostedAt = gpTimes[1];
    proposal.stage = 'Boosted';
  } else if (state === 6) {
    // QuietEndingPeriod
    proposal.quietEndingPeriodBeganAt = gpTimes[1];
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
  let gpProposal = gp.proposals(proposalId);

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
  proposal.stakesAgainst = gp.voteStake(proposalId, BigInt.fromI32(2));
  proposal.confidenceThreshold = gpProposal.value10;
  proposal.paramsHash = paramsHash;
  proposal.organizationId = gpProposal.value0;
  saveProposal(proposal);
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
