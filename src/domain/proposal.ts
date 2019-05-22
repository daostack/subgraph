import { Address, BigInt, Bytes, crypto, ipfs, json, JSONValueKind, store } from '@graphprotocol/graph-ts';
import { ControllerScheme, Proposal } from '../types/schema';
import {
  concat,
  equals,
  equalsBytes,
  equalStrings,
  getGPParameters,
  getGPProposal,
  getGPProposalTimes,
  getGPThreshold,
  getGPVoteStake,
} from '../utils';
import { updateThreshold } from './gpqueue';

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
    proposal.accountsWithUnclaimedRewards = new Array<Bytes>();
    proposal.paramsHash = new Bytes(32);
    proposal.organizationId = null;
    proposal.scheme = null;
    proposal.descriptionHash = '';
    proposal.title = '';
  }

  getProposalIPFSData(proposal);

  return proposal;
}

export function getProposalIPFSData(proposal: Proposal): Proposal {
    // IPFS reading
    if (!equalStrings(proposal.descriptionHash, '') && equalStrings(proposal.title, '')) {
      let ipfsData = ipfs.cat('/ipfs/' + proposal.descriptionHash);
      if (ipfsData != null && ipfsData.toString() !== '{}') {
        let descJson = json.fromBytes(ipfsData as Bytes);
        if (descJson.kind !== JSONValueKind.OBJECT) {
          return proposal;
        }
        if (descJson.toObject().get('title') != null) {
          proposal.title = descJson.toObject().get('title').toString();
        }
        if (descJson.toObject().get('description') != null) {
          proposal.description = descJson.toObject().get('description').toString();
        }
        if (descJson.toObject().get('url') != null) {
          proposal.url = descJson.toObject().get('url').toString();
        }
      }
    }
    return proposal;
}

export function saveProposal(proposal: Proposal): void {
  store.set('Proposal', proposal.id, proposal);
}

export function updateProposalAfterVote(
  proposal: Proposal,
  gpAddress: Address,
  proposalId: Bytes,
): void {
  let gpProposal = getGPProposal(gpAddress, proposalId);
  let prevOutcome = proposal.winningOutcome;
  proposal.votingMachine = gpAddress;
  // proposal.winningVote
  proposal.winningOutcome = parseOutcome(gpProposal.get('value3').toBigInt());
  if ((gpProposal.get('value2').toI32() === 6) && !equalStrings(proposal.winningOutcome, prevOutcome)) {
    setProposalState(proposal, 6, getGPProposalTimes(gpAddress, proposalId));
  }
}

export function updateProposalconfidence(id: Bytes, confidence: BigInt): void {
   let proposal = getProposal(id.toHex());
   proposal.confidenceThreshold = confidence;
   saveProposal(proposal);
}

export function updateProposalState(id: Bytes, state: number, gpAddress: Address): void {
   let proposal = getProposal(id.toHex());
   updateThreshold(proposal.dao.toString(),
                    gpAddress,
                    getGPThreshold(gpAddress, proposal.paramsHash, proposal.organizationId),
                    proposal.organizationId,
                    proposal.scheme,
                    );
   setProposalState(proposal, state, getGPProposalTimes(gpAddress, id));
   if (state === 4) {
     proposal.confidenceThreshold = getGPProposal(gpAddress, id).get('value10').toBigInt();
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
  timestamp: BigInt,
): void {
  let proposal = getProposal(proposalId.toHex());
  proposal.proposer = proposer;
  proposal.dao = avatarAddress.toHex();
  let params = getGPParameters(gpAddress, paramsHash);
  let gpProposal = getGPProposal(gpAddress, proposalId);

  proposal.votingMachine = gpAddress;
  proposal.stakesAgainst = getGPVoteStake(gpAddress, proposalId, BigInt.fromI32(2));
  proposal.confidenceThreshold = gpProposal.get('value10').toBigInt();
  proposal.paramsHash = paramsHash;
  proposal.organizationId = gpProposal.get('value0').toBytes();
  proposal.expiresInQueueAt = timestamp.plus(params.get('value1').toBigInt());
  proposal.createdAt = timestamp;
  proposal.scheme = crypto.keccak256(concat(avatarAddress, gpProposal.get('value1').toAddress())).toHex();

  proposal.queuedVoteRequiredPercentage = params.get('value0').toBigInt(); // queuedVoteRequiredPercentage
  proposal.queuedVotePeriodLimit = params.get('value1').toBigInt(); // queuedVotePeriodLimit
  proposal.boostedVotePeriodLimit = params.get('value2').toBigInt(); // boostedVotePeriodLimit
  proposal.preBoostedVotePeriodLimit = params.get('value3').toBigInt(); // preBoostedVotePeriodLimit
  proposal.thresholdConst = params.get('value4').toBigInt(); // thresholdConst
  proposal.limitExponentValue = params.get('value5').toBigInt(); // limitExponentValue
  proposal.quietEndingPeriod = params.get('value6').toBigInt(); // quietEndingPeriod
  proposal.proposingRepReward = params.get('value7').toBigInt();
  proposal.votersReputationLossRatio = params.get('value8').toBigInt(); // votersReputationLossRatio
  proposal.minimumDaoBounty = params.get('value9').toBigInt(); // minimumDaoBounty
  proposal.daoBountyConst = params.get('value10').toBigInt(); // daoBountyConst
  proposal.activationTime = params.get('value11').toBigInt(); // activationTime
  proposal.voteOnBehalf = params.get('value12').toAddress(); // voteOnBehalf

  updateThreshold(
    proposal.dao.toString(),
    gpAddress,
    getGPThreshold(gpAddress, proposal.paramsHash, proposal.organizationId),
    proposal.organizationId,
    proposal.scheme,
  );
  proposal.gpQueue = proposal.organizationId.toHex();
  let scheme = ControllerScheme.load(proposal.scheme);
  if (scheme.gpQueue == null) {
    scheme.gpQueue = proposal.organizationId.toHex();
    scheme.save();
  }
  saveProposal(proposal);
}

export function updateCRProposal(
  proposalId: Bytes,
  createdAt: BigInt,
  avatarAddress: Address,
  votingMachine: Address,
  descriptionHash: string,
  beneficiary: Address,
  schemeAddress: Address,
): void {
  let proposal = getProposal(proposalId.toHex());
  proposal.dao = avatarAddress.toHex();
  proposal.contributionReward = proposalId.toHex();
  proposal.createdAt = createdAt;
  proposal.votingMachine = votingMachine;
  proposal.descriptionHash = descriptionHash;
  proposal.scheme = crypto.keccak256(concat(avatarAddress, schemeAddress)).toHex();
  setSchemeName(proposal.scheme, 'ContributionReward');
  getProposalIPFSData(proposal);
  addRedeemableRewardOwner(proposal, beneficiary);
  saveProposal(proposal);

}

export function updateGSProposal(
  proposalId: Bytes,
  createdAt: BigInt,
  avatarAddress: Address,
  descriptionHash: string,
  schemeAddress: Address,
): void {
  let proposal = getProposal(proposalId.toHex());
  proposal.dao = avatarAddress.toHex();
  proposal.genericScheme = proposalId.toHex();
  proposal.createdAt = createdAt;
  proposal.descriptionHash = descriptionHash;
  proposal.scheme = crypto.keccak256(concat(avatarAddress, schemeAddress)).toHex();
  setSchemeName(proposal.scheme, 'GenericScheme');
  getProposalIPFSData(proposal);

  saveProposal(proposal);
}

export function updateSRProposal(
  proposalId: string,
  createdAt: BigInt,
  avatarAddress: Address,
  votingMachine: Address,
  descriptionHash: string,
  schemeAddress: Address,
): void {
  let proposal = getProposal(proposalId);
  proposal.dao = avatarAddress.toHex();
  proposal.schemeRegistrar = proposalId;
  proposal.createdAt = createdAt;
  proposal.votingMachine = votingMachine;
  proposal.descriptionHash = descriptionHash;
  proposal.scheme = crypto.keccak256(concat(avatarAddress, schemeAddress)).toHex();
  setSchemeName(proposal.scheme, 'SchemeRegistrar');
  getProposalIPFSData(proposal);

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
  if (executionState === 1) {
    proposal.executionState = 'QueueBarCrossed';
  } else if (executionState === 2) {
    proposal.executionState = 'QueueTimeOut';
  } else if (executionState === 3) {
    proposal.executionState = 'PreBoostedBarCrossed';
  } else if (executionState === 4) {
    proposal.executionState = 'BoostedTimeOut';
  } else if (executionState === 5) {
    proposal.executionState = 'BoostedBarCrossed';
  }
  saveProposal(proposal);
}

export function addRedeemableRewardOwner(
  proposal: Proposal,
  redeemer: Bytes,
): Proposal {
  let accounts = proposal.accountsWithUnclaimedRewards;
  accounts.push(redeemer);
  proposal.accountsWithUnclaimedRewards = accounts;
  return proposal;
}

export function removeRedeemableRewardOwner(
  proposalId: Bytes,
  redeemer: Bytes,
): void {
  let proposal = getProposal(proposalId.toHex());
  let accounts: Bytes[] = proposal.accountsWithUnclaimedRewards as Bytes[];
  let idx = 0;
  for (idx; idx < accounts.length; idx++) {
      if (equalsBytes(accounts[idx], redeemer)) {
        break;
      }
  }
  if (idx !== accounts.length) {
    accounts.splice(idx, 1);
    proposal.accountsWithUnclaimedRewards = accounts;
    saveProposal(proposal);
  }
}

export function setSchemeName(
  schemeId: string,
  name: string,
): void {
  let scheme = ControllerScheme.load(schemeId);
  if (scheme != null) {
    if (!equalStrings(scheme.name, name)) {
      scheme.name = name;
      scheme.save();
    }
  }
}
