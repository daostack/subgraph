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
} from '../../types/schema'

export function handleRedeemReputation(event: RedeemReputation): void {
    let ent = new ContributionRewardRedeemReputation();
    ent.txHash = event.transaction.hash;
    ent.contract = event.address;
    store.set('ContributionRewardRedeemReputation', ent.txHash.toHex(), ent);
}

export function handleRedeemNativeToken(event: RedeemNativeToken): void {
    let ent = new ContributionRewardRedeemNativeToken();
    ent.txHash = event.transaction.hash;
    ent.contract = event.address;
    store.set('ContributionRewardRedeemNativeToken', ent.txHash.toHex(), ent);
}

export function handleRedeemExternalToken(event: RedeemExternalToken): void {
    let ent = new ContributionRewardRedeemExternalToken();
    ent.txHash = event.transaction.hash;
    ent.contract = event.address;
    store.set('ContributionRewardRedeemExternalToken', ent.txHash.toHex(), ent);
}

export function handleRedeemEther(event: RedeemEther): void {
    let ent = new ContributionRewardRedeemEther();
    ent.txHash = event.transaction.hash;
    ent.contract = event.address;
    store.set('ContributionRewardRedeemEther', ent.txHash.toHex(), ent);
}

export function handleProposalExecuted(event: ProposalExecuted): void {
    let ent = new ContributionRewardProposalExecuted();
    ent.txHash = event.transaction.hash;
    ent.contract = event.address;
    store.set('ContributionRewardProposalExecuted', ent.txHash.toHex(), ent);
}

export function handleNewContributionProposal(event: NewContributionProposal): void {
    let ent = new ContributionRewardNewContributionProposal();
    ent.txHash = event.transaction.hash;
    ent.contract = event.address;
    store.set('ContributionRewardNewContributionProposal', ent.txHash.toHex(), ent);
}

