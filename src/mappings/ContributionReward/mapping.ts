import 'allocator/arena';
// // export { allocate_memory };

import { Address, BigInt, Bytes, store } from '@graphprotocol/graph-ts';

// Import event types from the Reputation contract ABI
import {
  ContributionReward,
  NewContributionProposal,
  ProposalExecuted,
  RedeemEther,
  RedeemExternalToken,
  RedeemNativeToken,
  RedeemReputation,
} from '../../types/ContributionReward/ContributionReward';

import * as domain from '../../domain';

// Import entity types generated from the GraphQL schema
import {
  ContributionRewardNewContributionProposal,
  ContributionRewardProposal,
  ContributionRewardProposalResolved,
  ContributionRewardRedeemEther,
  ContributionRewardRedeemExternalToken,
  ContributionRewardRedeemNativeToken,
  ContributionRewardRedeemReputation,
} from '../../types/schema';
import { equals, eventId } from '../../utils';

export function handleRedeemReputation(event: RedeemReputation): void {
  updateProposalafterRedemption(event.address, event.params._proposalId, 0);
  let ent = new ContributionRewardRedeemReputation(eventId(event));
  ent.id = eventId(event);
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.amount = event.params._amount;
  ent.avatar = event.params._avatar;
  ent.beneficiary = event.params._beneficiary;
  ent.proposalId = event.params._proposalId;
  store.set('ContributionRewardRedeemReputation', ent.id, ent);
}

export function handleRedeemNativeToken(event: RedeemNativeToken): void {
  updateProposalafterRedemption(event.address, event.params._proposalId, 1);
  let ent = new ContributionRewardRedeemNativeToken(eventId(event));
  ent.id = eventId(event);
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.amount = event.params._amount;
  ent.avatar = event.params._avatar;
  ent.beneficiary = event.params._beneficiary;
  ent.proposalId = event.params._proposalId;
  store.set('ContributionRewardRedeemNativeToken', ent.id, ent);
}

export function handleRedeemEther(event: RedeemEther): void {
  updateProposalafterRedemption(event.address, event.params._proposalId, 2);
  let ent = new ContributionRewardRedeemEther(eventId(event));
  ent.id = eventId(event);
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.amount = event.params._amount;
  ent.avatar = event.params._avatar;
  ent.beneficiary = event.params._beneficiary;
  ent.proposalId = event.params._proposalId;
  store.set('ContributionRewardRedeemEther', ent.id, ent);
}

export function handleRedeemExternalToken(event: RedeemExternalToken): void {
  updateProposalafterRedemption(event.address, event.params._proposalId, 3);
  let ent = new ContributionRewardRedeemExternalToken(eventId(event));
  ent.id = eventId(event);
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.amount = event.params._amount;
  ent.avatar = event.params._avatar;
  ent.beneficiary = event.params._beneficiary;
  ent.proposalId = event.params._proposalId;
  store.set('ContributionRewardRedeemExternalToken', ent.id, ent);
}

function insertNewProposal(event: NewContributionProposal): void {
  let ent = new ContributionRewardProposal(event.params._proposalId.toHex());
  ent.id = event.params._proposalId.toHex();
  ent.proposalId = event.params._proposalId;
  ent.contract = event.address;
  ent.avatar = event.params._avatar;
  ent.beneficiary = event.params._beneficiary;
  ent.descriptionHash = event.params._contributionDescription;
  ent.externalToken = event.params._externalToken;
  ent.votingMachine = event.params._intVoteInterface;
  ent.reputationReward = event.params._reputationChange;
  let rewards = event.params._rewards;
  ent.nativeTokenReward = rewards.shift(); // native tokens
  ent.ethReward = rewards.shift(); // eth
  ent.externalTokenReward = rewards.shift(); // external tokens
  ent.periodLength = rewards.shift(); // period length
  ent.periods = rewards.shift(); // number of periods
  store.set('ContributionRewardProposal', ent.id, ent);
}

function updateProposalafterRedemption(
  contributionRewardAddress: Address,
  proposalId: Bytes,
  type: number,
): void {
  let ent = store.get(
    'ContributionRewardProposal',
    proposalId.toHex(),
  ) as ContributionRewardProposal;
  if (ent != null) {
    let cr = ContributionReward.bind(contributionRewardAddress);
    if (type === 0) {
      ent.alreadyRedeemedReputationPeriods = cr.getRedeemedPeriods(
        proposalId,
        ent.avatar as Address,
        BigInt.fromI32(0),
      );
    } else if (type === 1) {
      ent.alreadyRedeemedNativeTokenPeriods = cr.getRedeemedPeriods(
        proposalId,
        ent.avatar as Address,
        BigInt.fromI32(1),
      );
    } else if (type === 2) {
      ent.alreadyRedeemedEthPeriods = cr.getRedeemedPeriods(
        proposalId,
        ent.avatar as Address,
        BigInt.fromI32(2),
      );
    } else if (type === 3) {
      ent.alreadyRedeemedExternalTokenPeriods = cr.getRedeemedPeriods(
        proposalId,
        ent.avatar as Address,
        BigInt.fromI32(3),
      );
    }
    store.set('ContributionRewardProposal', proposalId.toHex(), ent);
  }
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  domain.handleProposalExecuted(event);

  let cr = ContributionReward.bind(event.address);
  let proposalId = event.params._proposalId;
  let proposalEnt = store.get(
    'ContributionRewardProposal',
    proposalId.toHex(),
  ) as ContributionRewardProposal;
  if (proposalEnt != null) {
    let proposal = cr.organizationsProposals(event.params._avatar, proposalId);
    proposalEnt.executedAt = proposal.value8;
    store.set('ContributionRewardProposal', proposalId.toHex(), proposalEnt);
  }

  let ent = new ContributionRewardProposalResolved(eventId(event));
  ent.id = eventId(event);
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.avatar = event.params._avatar;
  ent.passed = equals(event.params._param, BigInt.fromI32(1));
  ent.proposalId = event.params._proposalId;
  store.set('ContributionRewardProposalResolved', ent.id, ent);
}

export function handleNewContributionProposal(
  event: NewContributionProposal,
): void {
  domain.handleNewContributionProposal(event);

  insertNewProposal(event);
  let ent = new ContributionRewardNewContributionProposal(eventId(event));
  ent.id = eventId(event);
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.avatar = event.params._avatar;
  ent.beneficiary = event.params._beneficiary;
  ent.descriptionHash = event.params._contributionDescription;
  ent.externalToken = event.params._externalToken;
  ent.votingMachine = event.params._intVoteInterface;
  ent.proposalId = event.params._proposalId;
  ent.reputationReward = event.params._reputationChange;
  let rewards = event.params._rewards;
  ent.nativeTokenReward = rewards.shift(); // native tokens
  ent.ethReward = rewards.shift(); // eth
  ent.externalTokenReward = rewards.shift(); // external tokens
  ent.periodLength = rewards.shift(); // period length
  ent.periods = rewards.shift(); // number of periods
  store.set('ContributionRewardNewContributionProposal', ent.id, ent);
}
