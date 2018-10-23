import 'allocator/arena'
export { allocate_memory }

import { Entity, Address, U256, Bytes, Value, store, crypto, ByteArray } from '@graphprotocol/graph-ts'

import { GPExecuteProposal, Stake, Redeem, RedeemDaoBounty, RedeemReputation,NewProposal, ExecuteProposal, VoteProposal } from '../types/GenesisProtocol/GenesisProtocol'

import { concat, updateRedemption } from '../utils'

export function handleNewProposal(event: NewProposal): void {
    let accountId = crypto.keccak256(concat(event.params._proposer, event.params._avatar)).toHex()
    let account = store.get('Account', accountId)
    if (account == null) {
        account = new Entity()
        account.setAddress('address', event.params._proposer)
        account.setString('accountId', accountId)
        account.setAddress('daoAvatarAddress', event.params._avatar)
        store.set('Account', accountId, account as Entity)
    }

    let proposal = new Entity()

    proposal.setString('proposalId', event.params._proposalId.toHex())
    proposal.setAddress('daoAvatarAddress', event.params._avatar)
    proposal.setU256('numOfChoices', event.params._numOfChoices)
    proposal.setAddress('proposer', event.params._proposer)

    store.set('Proposal', event.params._proposalId.toHex(), proposal as Entity)
}

export function handleVoteProposal(event: VoteProposal): void {
    let accountId = crypto.keccak256(concat(event.params._voter, event.params._avatar)).toHex()

    // Account created during mint

    let vote = new Entity()
    let uniqueId = concat(event.params._proposalId, event.params._voter).toHex()

    vote.setString('accountId', accountId)
    vote.setString('proposalId', event.params._proposalId.toHex())
    vote.setAddress('voterAddress', event.params._voter)
    vote.setU256('voteOption', event.params._vote)

    store.set('Vote', uniqueId, vote as Entity)
}

export function handleStake(event: Stake): void {
    let accountId = crypto.keccak256(concat(event.params._staker, event.params._avatar)).toHex()
    let account = store.get('Account', accountId)
    if (account == null) {
        account = new Entity()
        account.setAddress('address', event.params._staker)
        account.setString('accountId', accountId)
        account.setAddress('daoAvatarAddress', event.params._avatar)
        store.set('Account', accountId, account as Entity)
    }

    let stake = new Entity()
    let uniqueId = crypto.keccak256(concat(event.params._proposalId, event.params._staker)).toHex()

    stake.setString('accountId', accountId)
    stake.setString('proposalId', event.params._proposalId.toHex())
    stake.setAddress('stakerAddress', event.params._staker)
    stake.setU256('prediction', event.params._vote)
    stake.setU256('stakeAmount', event.params._amount)

    store.set('Stake', uniqueId, stake as Entity)
}

export function handleGPExecuteProposal (event: GPExecuteProposal): void {
    let proposal = new Entity()

    //proposal.setInt('state', event.params._executionState as u32)
    store.set('Proposal', event.params._proposalId.toHex(), proposal as Entity)
}

export function handleExecuteProposal(event: ExecuteProposal): void {
    let proposal = new Entity()

    proposal.setU256('executionTime', event.block.timestamp)
    proposal.setU256('decision', event.params._decision)
    store.set('Proposal', event.params._proposalId.toHex(), proposal as Entity)
}

export function handleRedeem (event: Redeem): void {
    let rewardType = new Uint8Array(1)
    rewardType[0] = 5
    updateRedemption(
        event.params._beneficiary,
        event.params._avatar,
        event.params._amount,
        event.params._proposalId,
        rewardType as ByteArray,
        'gpGen'
        )
}

export function handleRedeemDaoBounty (event: RedeemDaoBounty): void {
    let rewardType = new Uint8Array(1)
    rewardType[0] = 6
    updateRedemption(
        event.params._beneficiary,
        event.params._avatar,
        event.params._amount,
        event.params._proposalId,
        rewardType as ByteArray,
        'gpBounty'
        )
}

export function handleRedeemReputation (event: RedeemReputation): void {
    let rewardType = new Uint8Array(1)
    rewardType[0] = 4
    updateRedemption(
        event.params._beneficiary,
        event.params._avatar,
        event.params._amount,
        event.params._proposalId,
        rewardType as ByteArray,
        'gpRep'
        )
}
