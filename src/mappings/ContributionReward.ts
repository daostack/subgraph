import 'allocator/arena'
export { allocate_memory }

import {
    ByteArray,
    store,
} from '@graphprotocol/graph-ts'

import {
    NewContributionProposal,
    RedeemEther,
    RedeemExternalToken,
    RedeemNativeToken,
    RedeemReputation,
} from '../types/ContributionReward/ContributionReward'

import {
    updateRedemption,
    createAccount,
} from '../utils'

import {
    ProposalType,
    CRProposal,
} from '../types/schema'

const REWARD_TYPE_ETH = 0
const REWARD_TYPE_NATIVE_TOKEN = 1 
const REWARD_TYPE_BENEFICIARY_REPUTATION = 2
const REWARD_TYPE_EXTERNAL_TOKEN = 3

export function handleNewContributionProposal(event: NewContributionProposal): void {
    let proposalType = new ProposalType()
    proposalType.proposalId = event.params._proposalId.toHex()
    proposalType.proposalScheme = event.address
    proposalType.voteInterface = event.params._intVoteInterface
    store.set('ProposalType', event.params._proposalId.toHex(), proposalType as ProposalType)
    let accountId = createAccount(event.params._beneficiary, event.params._avatar)
    let crproposal = new CRProposal()
    crproposal.proposalId = event.params._proposalId.toHex()
    crproposal.contributionDescriptionHash = event.params._contributionDescription
    crproposal.reputationChange = event.params._reputationChange
    crproposal.externalToken = event.params._externalToken
    crproposal.beneficiary = accountId.toHex()
    store.set('CRProposal', event.params._proposalId.toHex(), crproposal as CRProposal)
}

export function handleRedeemEther(event: RedeemEther): void {
    let rewardType = new Uint8Array(1)
    rewardType[0] = REWARD_TYPE_ETH
    updateRedemption(
        event.params._beneficiary,
        event.params._avatar,
        event.params._amount,
        null,
        event.params._proposalId,
        rewardType as ByteArray,
        'beneficiaryEth',
        event.block.timestamp
    )
}

export function handleRedeemExternalToken(event: RedeemExternalToken): void {
    let rewardType = new Uint8Array(1)
    rewardType[0] = REWARD_TYPE_EXTERNAL_TOKEN
    updateRedemption(
        event.params._beneficiary,
        event.params._avatar,
        event.params._amount,
        null,
        event.params._proposalId,
        rewardType as ByteArray,
        'beneficiaryExternalToken',
        event.block.timestamp
        )
}

export function handleRedeemNativeToken(event: RedeemNativeToken): void {
    let rewardType = new Uint8Array(1)
    rewardType[0] = REWARD_TYPE_NATIVE_TOKEN
    updateRedemption(
        event.params._beneficiary,
        event.params._avatar,
        event.params._amount,
        null,
        event.params._proposalId,
        rewardType as ByteArray,
        'beneficiaryNativeToken',
        event.block.timestamp
    )
}

export function handleRedeemReputation(event: RedeemReputation): void {
    let rewardType = new Uint8Array(1)
    rewardType[0] = REWARD_TYPE_BENEFICIARY_REPUTATION
    updateRedemption(
        event.params._beneficiary,
        event.params._avatar,
        null,
        event.params._amount,
        event.params._proposalId,
        rewardType as ByteArray,
        'beneficiaryReputation',
        event.block.timestamp
    )
}
