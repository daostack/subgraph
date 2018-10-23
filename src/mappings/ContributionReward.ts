import 'allocator/arena'
export { allocate_memory }

import { Entity, Address, U256, Bytes, Value, store, crypto, ByteArray } from '@graphprotocol/graph-ts'

import { NewContributionProposal, RedeemReputation, RedeemEther, RedeemNativeToken, RedeemExternalToken } from '../types/ContributionReward/ContributionReward'

import { concat, updateRedemption } from '../utils'

export function handleNewContributionProposal(event: NewContributionProposal): void {
    let accountId = crypto.keccak256(concat(event.params._beneficiary, event.params._avatar)).toHex()

    // Account created during mint

    let proposal = new Entity()

    proposal.setU256('submittedTime', event.block.timestamp)
    proposal.setAddress('beneficiaryAddress', event.params._beneficiary)
    proposal.setI256('reputationChange', event.params._reputationChange)
    proposal.setString('contributionDescriptionHash', event.params._contributionDescription.toHex())
    proposal.setAddress('externalToken', event.params._externalToken)
    //proposal.setU256('periodLength', event.params._rewards[4])

    store.set('Proposal', event.params._proposalId.toHex(), proposal as Entity)
}

export function handleRedeemReputation(event: RedeemReputation): void {
    let rewardType = new Uint8Array(1)
    rewardType[0] = 2
    let accountId = crypto.keccak256(concat(event.params._beneficiary, event.params._avatar))
    let rewardId = crypto.keccak256(concat(rewardType as ByteArray, event.params._amount as ByteArray))

    let uniqueId = crypto.keccak256(concat(event.params._proposalId, concat(accountId, rewardId))).toHex()

    let redemption = store.get('Redemption', uniqueId)
    if (redemption == null)
    {
        redemption = new Entity()
        redemption.setString('accountId', accountId.toHex())
        redemption.setString('proposalId', event.params._proposalId.toHex())
        redemption.setString('rewardId', rewardId.toHex())
        store.set('Redemption', uniqueId, redemption as Entity)
    }

    let reward = store.get('Reward', rewardId.toHex())
    if (reward == null)
    {
        reward = new Entity()
        reward.setString('id', rewardId.toHex())
        reward.setString('type', 'beneficiaryReputation')
        reward.setI256('amount', event.params._amount)

        store.set('Reward', rewardId.toHex(), reward as Entity)
    }
}

export function handleRedeemEther(event: RedeemEther): void {
    let rewardType = new Uint8Array(1)
    rewardType[0] = 0
    updateRedemption(
        event.params._beneficiary,
        event.params._avatar,
        event.params._amount,
        event.params._proposalId,
        rewardType as ByteArray,
        'beneficiaryEth'
        )
}

export function handleRedeemNativeToken(event: RedeemNativeToken): void {
    let rewardType = new Uint8Array(1)
    rewardType[0] = 1
    updateRedemption(
        event.params._beneficiary,
        event.params._avatar,
        event.params._amount,
        event.params._proposalId,
        rewardType as ByteArray,
        'beneficiaryNativeToken'
        )
}

export function handleRedeemExternalToken(event: RedeemExternalToken): void {
    let rewardType = new Uint8Array(1)
    rewardType[0] = 3
    updateRedemption(
        event.params._beneficiary,
        event.params._avatar,
        event.params._amount,
        event.params._proposalId,
        rewardType as ByteArray,
        'beneficiaryExternalToken'
        )
}
