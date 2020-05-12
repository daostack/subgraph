import { Address, BigInt, Bytes, crypto, store } from '@graphprotocol/graph-ts';

// Import event types from the ContributionRewardExt contract ABI
import {
  ContributionRewardExt,
  NewContributionProposal,
  ProposalExecuted,
  RedeemEther,
  RedeemExternalToken,
  RedeemNativeToken,
  RedeemReputation,
} from '../../types/ContributionRewardExt/ContributionRewardExt';

import * as domain from '../../domain';

import { removeRedeemableRewardOwner } from '../../domain/proposal';

import { shouldRemoveAccountFromUnclaimed, shouldRemoveContributorFromUnclaimed } from '../../domain/reward';

// Import entity types generated from the GraphQL schema
import {
  ContributionRewardNewContributionProposal,
  ContributionRewardProposal,
  ContributionRewardProposalResolved,
  ContributionRewardRedeemEther,
  ContributionRewardRedeemExternalToken,
  ContributionRewardRedeemNativeToken,
  ContributionRewardRedeemReputation,
  GPReward,
} from '../../types/schema';
import { concat, eventId, save } from '../../utils';

export function handleRedeemReputation(event: RedeemReputation): void {
  updateProposalAfterRedemption(event.address, event.params._proposalId, 0, event.block.timestamp);
  let ent = new ContributionRewardRedeemReputation(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.amount = event.params._amount;
  ent.avatar = event.params._avatar;
  ent.beneficiary = event.params._beneficiary;
  ent.proposalId = event.params._proposalId;
  save(ent, 'ContributionRewardRedeemReputation', event.block.timestamp);
}

export function handleRedeemNativeToken(event: RedeemNativeToken): void {
  updateProposalAfterRedemption(event.address, event.params._proposalId, 1, event.block.timestamp);
  let ent = new ContributionRewardRedeemNativeToken(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.amount = event.params._amount;
  ent.avatar = event.params._avatar;
  ent.beneficiary = event.params._beneficiary;
  ent.proposalId = event.params._proposalId;
  save(ent, 'ContributionRewardRedeemNativeToken', event.block.timestamp);
}

export function handleRedeemEther(event: RedeemEther): void {
  updateProposalAfterRedemption(event.address, event.params._proposalId, 2, event.block.timestamp);
  let ent = new ContributionRewardRedeemEther(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.amount = event.params._amount;
  ent.avatar = event.params._avatar;
  ent.beneficiary = event.params._beneficiary;
  ent.proposalId = event.params._proposalId;
  save(ent, 'ContributionRewardRedeemEther', event.block.timestamp);
}

export function handleRedeemExternalToken(event: RedeemExternalToken): void {
  updateProposalAfterRedemption(event.address, event.params._proposalId, 3, event.block.timestamp);
  let ent = new ContributionRewardRedeemExternalToken(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.amount = event.params._amount;
  ent.avatar = event.params._avatar;
  ent.beneficiary = event.params._beneficiary;
  ent.proposalId = event.params._proposalId;
  save(ent, 'ContributionRewardRedeemExternalToken', event.block.timestamp);
}

function insertNewProposal(event: NewContributionProposal): void {
  let ent = new ContributionRewardProposal(event.params._proposalId.toHex());
  ent.proposalId = event.params._proposalId;
  ent.contract = event.address;
  ent.avatar = event.params._avatar;
  ent.beneficiary = event.params._beneficiary;
  ent.descriptionHash = event.params._descriptionHash;
  ent.externalToken = event.params._externalToken;
  ent.votingMachine = event.params._intVoteInterface;
  ent.reputationReward = event.params._reputationChange;
  let rewards = event.params._rewards;
  ent.nativeTokenReward = rewards.shift(); // native tokens
  ent.ethReward = rewards.shift(); // eth
  ent.externalTokenReward = rewards.shift(); // external tokens
  ent.periods = BigInt.fromI32(1); // number of periods
  save(ent, 'ContributionRewardProposal', event.block.timestamp);
}

function updateProposalAfterRedemption(
  contributionRewardAddress: Address,
  proposalId: Bytes,
  type: number,
  timestamp: BigInt,
): void {
  let ent = store.get(
    'ContributionRewardProposal',
    proposalId.toHex(),
  ) as ContributionRewardProposal;
  if (ent != null) {
    let cr = ContributionRewardExt.bind(contributionRewardAddress);
    let proposal = cr.organizationProposals(proposalId);
    if (type == 0) {
      if (proposal.value1.isZero()) {
        ent.alreadyRedeemedReputationPeriods = BigInt.fromI32(1);
      }
      ent.reputationChangeLeft = proposal.value7;
    } else if (type == 1) {
      if (proposal.value0.isZero()) {
        ent.alreadyRedeemedNativeTokenPeriods = BigInt.fromI32(1);
      }
      ent.nativeTokenRewardLeft = proposal.value6;
    } else if (type == 2) {
      if (proposal.value2.isZero()) {
        ent.alreadyRedeemedEthPeriods = BigInt.fromI32(1);
      }
      ent.ethRewardLeft = proposal.value8;
    } else if (type == 3) {
      if (proposal.value4.isZero()) {
        ent.alreadyRedeemedExternalTokenPeriods = BigInt.fromI32(1);
      }
      ent.externalTokenRewardLeft = proposal.value9;
    }
    save(ent, 'ContributionRewardProposal', timestamp);
    let reward = GPReward.load(crypto.keccak256(concat(proposalId, ent.beneficiary)).toHex());
    if ((reward !== null && shouldRemoveAccountFromUnclaimed(reward as GPReward)) ||
    (reward == null && shouldRemoveContributorFromUnclaimed(ent))) {
      removeRedeemableRewardOwner(proposalId, ent.beneficiary, timestamp);
    }
  }
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let proposalId = event.params._proposalId;
  let proposalEnt = store.get(
    'ContributionRewardProposal',
    proposalId.toHex(),
  ) as ContributionRewardProposal;
  if (proposalEnt != null) {
    proposalEnt.executedAt = event.block.timestamp;
    if (event.params._param.toI32() == 1) {
      proposalEnt.reputationChangeLeft = proposalEnt.reputationReward;
      proposalEnt.nativeTokenRewardLeft = proposalEnt.nativeTokenReward;
      proposalEnt.ethRewardLeft = proposalEnt.ethReward;
      proposalEnt.externalTokenRewardLeft = proposalEnt.externalTokenReward;
    }
    save(proposalEnt, 'ContributionRewardProposal', event.block.timestamp);
  }

  let ent = new ContributionRewardProposalResolved(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.avatar = event.params._avatar;
  ent.passed = (event.params._param.toI32() == 1);
  ent.proposalId = event.params._proposalId;
  save(ent, 'ContributionRewardProposalResolved', event.block.timestamp);
}

export function handleNewContributionProposal(
  event: NewContributionProposal,
): void {
  domain.handleNewContributionProposal(
    event.params._proposalId,
    event.params._avatar,
    event.block.timestamp,
    event.params._intVoteInterface,
    event.params._descriptionHash,
    event.address,
  );

  insertNewProposal(event);
  let ent = new ContributionRewardNewContributionProposal(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.avatar = event.params._avatar;
  ent.beneficiary = event.params._beneficiary;
  ent.descriptionHash = event.params._descriptionHash;
  ent.externalToken = event.params._externalToken;
  ent.votingMachine = event.params._intVoteInterface;
  ent.proposalId = event.params._proposalId;
  ent.reputationReward = event.params._reputationChange;
  let rewards = event.params._rewards;
  ent.nativeTokenReward = rewards.shift(); // native tokens
  ent.ethReward = rewards.shift(); // eth
  ent.externalTokenReward = rewards.shift(); // external tokens
  ent.periods = BigInt.fromI32(1); // number of periods
  save(ent, 'ContributionRewardNewContributionProposal', event.block.timestamp);
}
