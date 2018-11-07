import 'allocator/arena'
export { allocate_memory }

import { Address, store, BigInt, Bytes } from '@graphprotocol/graph-ts'

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
    ContributionRewardProposalResolved,
    ContributionRewardRedeemReputation,
    ContributionRewardRedeemEther,
    ContributionRewardRedeemExternalToken,
    ContributionRewardRedeemNativeToken,
    ContributionRewardProposal,
} from '../../types/schema';
import { equals } from '../../utils';

export function handleRedeemReputation(event: RedeemReputation): void {
    updateProposalafterRedemption(event.address, event.params._proposalId);
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
    updateProposalafterRedemption(event.address, event.params._proposalId);
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
    updateProposalafterRedemption(event.address, event.params._proposalId);
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
    updateProposalafterRedemption(event.address, event.params._proposalId);
    let ent = new ContributionRewardRedeemEther();
    ent.txHash = event.transaction.hash.toHex();
    ent.contract = event.address;
    ent.amount = event.params._amount;
    ent.avatar = event.params._avatar;
    ent.beneficiary = event.params._beneficiary;
    ent.proposalId = event.params._proposalId;
    store.set('ContributionRewardRedeemEther', ent.txHash, ent);
}

function insertNewProposal(event: NewContributionProposal): void {
    updateProposalafterRedemption(event.address, event.params._proposalId);
    let ent = new ContributionRewardProposal();
    ent.proposalId = event.params._proposalId.toHex();
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
    store.set('ContributionRewardProposal', ent.proposalId, ent);
}

function updateProposalafterRedemption(contributionRewardAddress: Address, proposalId: Bytes): void {
    let ent = store.get('ContributionRewardProposal', proposalId.toHex()) as ContributionRewardProposal;
    if (ent != null) {
        let cr = ContributionReward.bind(contributionRewardAddress);
        ent.alreadyRedeemedReputationPeriods = cr.getRedeemedPeriods(proposalId, Address.fromString(ent.avatar.toHex()), BigInt.fromI32(0))
        ent.alreadyRedeemedNativeTokenPeriods = cr.getRedeemedPeriods(proposalId, Address.fromString(ent.avatar.toHex()), BigInt.fromI32(1))
        ent.alreadyRedeemedEthPeriods = cr.getRedeemedPeriods(proposalId, Address.fromString(ent.avatar.toHex()), BigInt.fromI32(2))
        ent.alreadyRedeemedExternalTokenPeriods = cr.getRedeemedPeriods(proposalId, Address.fromString(ent.avatar.toHex()), BigInt.fromI32(3))
    }
}

export function handleProposalExecuted(event: ProposalExecuted): void {
    let cr = ContributionReward.bind(event.address);
    let proposalId = event.params._proposalId;
    let proposalEnt = store.get('ContributionRewardProposal', proposalId.toHex()) as ContributionRewardProposal;
    if (proposalEnt != null) {
        let proposal = cr.organizationsProposals(event.params._avatar, proposalId);
        proposalEnt.executedAt = proposal.value9;
        store.set('ContributionRewardProposal', proposalId.toHex(), proposalEnt);
    }

    let ent = new ContributionRewardProposalResolved();
    ent.txHash = event.transaction.hash.toHex();
    ent.contract = event.address;
    ent.avatar = event.params._avatar;
    ent.passed = equals(event.params._param, BigInt.fromI32(1));
    ent.proposalId = event.params._proposalId;
    store.set('ContributionRewardProposalResolved', ent.txHash, ent);
}

export function handleNewContributionProposal(event: NewContributionProposal): void {
    insertNewProposal(event);
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
    let rewards = event.params._rewards;
    ent.nativeTokenReward = rewards.shift(); // native tokens
    ent.ethReward = rewards.shift(); // eth
    ent.externalTokenReward = rewards.shift(); // external tokens
    ent.periodLength = rewards.shift(); // period length
    ent.periods = rewards.shift(); // number of periods
    store.set('ContributionRewardNewContributionProposal', ent.txHash, ent);
}

