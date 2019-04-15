import { Address, BigInt, Bytes, crypto, ipfs, json, JSONValueKind, store } from '@graphprotocol/graph-ts';
import { setSchemeName } from '../mappings/Controller/mapping';
import { GenesisProtocol } from '../types/GenesisProtocol/GenesisProtocol';
import { Proposal } from '../types/schema';
import { concat, equals, equalsBytes } from '../utils';
import { countProposalInQueue, setScheme, updateThreshold } from './gpqueue';

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
    proposal.paramsHash = new Bytes();
    proposal.organizationId = null;
    proposal.scheme = null;
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
   countProposalInQueue(proposal.organizationId, stageToNumber(proposal.stage), state);
   updateThreshold(proposal.dao.toString(),
                    gpAddress,
                    gp.threshold(proposal.paramsHash, proposal.organizationId),
                    proposal.paramsHash,
                    proposal.organizationId,
                    );
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

function stageToNumber(stage: string): number {
  // enum ProposalState { None, ExpiredInQueue, Executed, Queued, PreBoosted, Boosted, QuietEndingPeriod}
  if (stage === 'ExpiredInQueue') {
    // Closed
    return 1;
  } else if (stage === 'Executed') {
    // Executed
    return 2;
  } else if (stage === 'Queued') {
    // Queued
    return 3;
  } else if (stage === 'PreBoosted') {
    // PreBoosted
    return 4;
  } else if (stage === 'Boosted') {
    // Boosted
    return 5;
  } else if (stage === 'QuietEndingPeriod') {
    // QuietEndingPeriod
    return 6;
  }
  return 3;
}

export function updateGPProposal(
  gpAddress: Address,
  proposalId: Bytes,
  proposer: Address,
  avatarAddress: Address,
  paramsHash: Bytes,
  timestamp: BigInt,
): void {
  let gp = GenesisProtocol.bind(gpAddress);
  let proposal = getProposal(proposalId.toHex());
  proposal.proposer = proposer;
  proposal.dao = avatarAddress.toHex();
  let params = gp.parameters(paramsHash);
  let gpProposal = gp.proposals(proposalId);

  proposal.votingMachine = gpAddress;
  proposal.stakesAgainst = gp.voteStake(proposalId, BigInt.fromI32(2));
  proposal.confidenceThreshold = gpProposal.value10;
  proposal.paramsHash = paramsHash;
  proposal.organizationId = gpProposal.value0;
  proposal.expiresInQueueAt = timestamp.plus(params.value1);
  proposal.createdAt = timestamp;
  updateThreshold(
    proposal.dao.toString(),
    gpAddress,
    gp.threshold(proposal.paramsHash, proposal.organizationId),
    proposal.paramsHash,
    proposal.organizationId,
  );
  proposal.gpQueue = proposal.organizationId.toHex();
  saveProposal(proposal);
}

export function updateCRProposal(
  proposalId: Bytes,
  createdAt: BigInt,
  avatarAddress: Address,
  votingMachine: Address,
  descriptionHash: string,
  schemeAddress: Address,
): void {
  let proposal = getProposal(proposalId.toHex());
  proposal.dao = avatarAddress.toHex();
  proposal.contributionReward = proposalId.toHex();
  proposal.createdAt = createdAt;
  proposal.votingMachine = votingMachine;
  proposal.descriptionHash = descriptionHash;
  proposal.scheme = crypto.keccak256(concat(avatarAddress, schemeAddress)).toHex();
  if (proposal.organizationId != null && proposal.scheme != null) {
    setScheme(proposal.organizationId, proposal.scheme);
    setSchemeName(proposal.scheme, 'ContributionReward');
  }

  // IPFS reading

  let ipfsData = ipfs.cat('/ipfs/' + descriptionHash);
  if (ipfsData != null && ipfsData.toString() !== '{}') {
    let descJson = json.fromBytes(ipfsData as Bytes);
    if (descJson.kind !== JSONValueKind.OBJECT) {
      saveProposal(proposal);
      return;
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
  if (proposal.organizationId != null && proposal.scheme != null) {
    setScheme(proposal.organizationId, proposal.scheme);
    setSchemeName(proposal.scheme, 'GenericScheme');
  }
  // IPFS reading

  let ipfsData = ipfs.cat('/ipfs/' + descriptionHash);
  if (ipfsData != null && ipfsData.toString() !== '{}') {
    let descJson = json.fromBytes(ipfsData as Bytes);
    if (descJson.kind !== JSONValueKind.OBJECT) {
      saveProposal(proposal);
      return;
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
  if (proposal.organizationId != null && proposal.scheme != null) {
    setScheme(proposal.organizationId, proposal.scheme);
    setSchemeName(proposal.scheme, 'SchemeRegistrar');
  }

  // IPFS reading

  let ipfsData = ipfs.cat('/ipfs/' + descriptionHash);
  if (ipfsData != null && ipfsData.toString() !== '{}') {
    let descJson = json.fromBytes(ipfsData as Bytes);
    if (descJson.kind !== JSONValueKind.OBJECT) {
      saveProposal(proposal);
      return;
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
  proposalId: Bytes,
  redeemer: Bytes,
): void {
  let proposal = getProposal(proposalId.toHex());
  let accounts = proposal.accountsWithUnclaimedRewards;
  accounts.push(redeemer);
  proposal.accountsWithUnclaimedRewards = accounts;
  saveProposal(proposal);
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
