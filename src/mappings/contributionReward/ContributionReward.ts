import 'allocator/arena'
export { allocate_memory }

import { Entity, Address, Value, store, crypto, ByteArray, BigInt } from '@graphprotocol/graph-ts'

// Import event types from the Reputation contract ABI
import {
    RedeemReputation,
    RedeemNativeToken,
    RedeemExternalToken,
    RedeemEther,
    ProposalExecuted,
    NewContributionProposal,
    ContributionReward
} from '../../types/ContributionReward/ContributionReward'

// Import entity types generated from the GraphQL schema
import {
    ContributionRewardNewContributionProposal,
    ContributionRewardProposalExecuted,
    ContributionRewardRedeemReputation,
    ContributionRewardRedeemEther,
    ContributionRewardRedeemExternalToken,
    ContributionRewardRedeemNativeToken
} from '../../types/schema';

export function handleRedeemReputation(event: RedeemReputation): void {
    let ent = new ContributionRewardRedeemReputation();
    ent.txHash = event.transaction.hash.toHex();
    ent.contract = event.address;
    ent.amount = event.params._amount;
    ent.avatar = event.params._avatar;
    ent.beneficiary = event.params._beneficiary;
    ent.proposalId = event.params._proposalId;
    store.set('ContributionRewardRedeemReputation', ent.txHash, ent);
}

export function handleRedeemNativeToken(event: RedeemNativeToken): void {
    let ent = new ContributionRewardRedeemNativeToken();
    ent.txHash = event.transaction.hash.toHex();
    ent.contract = event.address;
    ent.amount = event.params._amount;
    ent.avatar = event.params._avatar;
    ent.beneficiary = event.params._beneficiary;
    ent.proposalId = event.params._proposalId;
    store.set('ContributionRewardRedeemNativeToken', ent.txHash, ent);
}

export function handleRedeemExternalToken(event: RedeemExternalToken): void {
    let ent = new ContributionRewardRedeemExternalToken();
    ent.txHash = event.transaction.hash.toHex();
    ent.contract = event.address;
    ent.amount = event.params._amount;
    ent.avatar = event.params._avatar;
    ent.beneficiary = event.params._beneficiary;
    ent.proposalId = event.params._proposalId;
    store.set('ContributionRewardRedeemExternalToken', ent.txHash, ent);
}

export function handleRedeemEther(event: RedeemEther): void {
    let ent = new ContributionRewardRedeemEther();
    ent.txHash = event.transaction.hash.toHex();
    ent.contract = event.address;
    ent.amount = event.params._amount;
    ent.avatar = event.params._avatar;
    ent.beneficiary = event.params._beneficiary;
    ent.proposalId = event.params._proposalId;
    store.set('ContributionRewardRedeemEther', ent.txHash, ent);
}

export function handleProposalExecuted(event: ProposalExecuted): void {
    let ent = new ContributionRewardProposalExecuted();
    ent.txHash = event.transaction.hash.toHex();
    ent.contract = event.address;
    ent.avatar = event.params._avatar;
    ent.paramsHash = event.params._param;
    ent.proposalId = event.params._proposalId;
    store.set('ContributionRewardProposalExecuted', ent.txHash, ent);
}

export function handleNewContributionProposal(event: NewContributionProposal): void {
    let ent = new ContributionRewardNewContributionProposal();
    ent.txHash = event.transaction.hash.toHex();
    ent.contract = event.address;
    ent.avatar = event.params._avatar;
    ent.beneficiary = event.params._beneficiary;
    ent.descriptionHash = event.params._contributionDescription;
    ent.externalToken = event.params._externalToken;
    ent.votingMachine = event.params._intVoteInterface;
    ent.proposalId = event.params._proposalId;
    ent.reputationReward = event.params._reputationChange;
    ent.nativeTokenReward = event.params._rewards[0]; // native tokens
    ent.ethReward = event.params._rewards[1]; // eth
    ent.externalTokenReward = event.params._rewards[2]; // external tokens
    ent.periodLength = event.params._rewards[3]; // period length
    ent.periods = event.params._rewards[4]; // number of periods
    store.set('ContributionRewardNewContributionProposal', ent.txHash, ent);
}

