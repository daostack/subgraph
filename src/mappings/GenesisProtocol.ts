import 'allocator/arena'
export { allocate_memory }

import {
    ByteArray,
    store,
} from '@graphprotocol/graph-ts'

import {
    ExecuteProposal,
    GPExecuteProposal,
    NewProposal,
    Redeem,
    RedeemDaoBounty,
    RedeemReputation,
    Stake as StakeEvent,
    VoteProposal,
} from '../types/GenesisProtocol/GenesisProtocol'

import {
    concat,
    updateRedemption,
    createAccount,
} from '../utils'

import {
    Proposal,
    Redemption,
    Stake,
    Vote,
} from '../types/schema'

const REWARD_TYPE_GP_REP = 4
const REWARD_TYPE_GP_GEN = 5
const REWARD_TYPE_GP_BOUNTY = 6

export function handleExecuteProposal(event: ExecuteProposal): void {
    let proposal = new Proposal()
    proposal.proposalId = event.params._proposalId.toHex()
    proposal.dao = event.params._avatar.toHex()
    proposal.executionTime = event.block.timestamp
    proposal.decision = event.params._decision
    store.set('Proposal', event.params._proposalId.toHex(), proposal as Proposal)
}

export function handleGPExecuteProposal (event: GPExecuteProposal): void {
    //let proposal = new Proposal()
    //proposal.state = event.params._executionState
    //store.set('Proposal', event.params._proposalId.toHex(), proposal as Proposal)
}

export function handleNewProposal(event: NewProposal): void {
    let accountId = createAccount(event.params._proposer, event.params._avatar)
    let proposal = new Proposal()
    proposal.proposalId = event.params._proposalId.toHex()
    proposal.dao = event.params._avatar.toHex()
    proposal.proposer = accountId.toHex()
    proposal.submittedTime = event.block.timestamp
    proposal.numOfChoices = event.params._numOfChoices
    proposal.paramsHash = event.params._paramsHash
    store.set('Proposal', event.params._proposalId.toHex(), proposal as Proposal)
}

export function handleRedeem (event: Redeem): void {
    let rewardType = new Uint8Array(1)
    rewardType[0] = REWARD_TYPE_GP_GEN
    updateRedemption(
        event.params._beneficiary,
        event.params._avatar,
        event.params._amount,
        null,
        event.params._proposalId,
        rewardType as ByteArray,
        'gpGen',
        event.block.timestamp
    )
}

export function handleRedeemDaoBounty (event: RedeemDaoBounty): void {
    let rewardType = new Uint8Array(1)
    rewardType[0] = REWARD_TYPE_GP_BOUNTY
    updateRedemption(
        event.params._beneficiary,
        event.params._avatar,
        event.params._amount,
        null,
        event.params._proposalId,
        rewardType as ByteArray,
        'gpBounty',
        event.block.timestamp
    )
}

export function handleRedeemReputation (event: RedeemReputation): void {
    let rewardType = new Uint8Array(1)
    rewardType[0] = REWARD_TYPE_GP_REP
    updateRedemption(
        event.params._beneficiary,
        event.params._avatar,
        event.params._amount,
        null,
        event.params._proposalId,
        rewardType as ByteArray,
        'gpRep',
        event.block.timestamp
    )
}

export function handleStake(event: StakeEvent): void {
    let accountId = createAccount(event.params._staker, event.params._avatar)
    let stake = new Stake()
    stake.proposal = event.params._proposalId.toHex()
    stake.dao = event.params._avatar.toHex()
    stake.staker = accountId.toHex()
    stake.prediction = event.params._vote
    stake.stakeAmount = event.params._amount
    stake.time = event.block.timestamp
    let uniqueId = concat(event.params._proposalId, event.params._staker).toHex()
    store.set('Stake', uniqueId, stake as Stake)
}

// TODO: add reputation of voter at time of vote? Archive node needed
export function handleVoteProposal(event: VoteProposal): void {
    let accountId = createAccount(event.params._voter, event.params._avatar)
    let vote = new Vote()
    vote.proposal = event.params._proposalId.toHex()
    vote.dao = event.params._avatar.toHex()
    vote.voter = accountId.toHex()
    vote.voteOption = event.params._vote
    vote.time = event.block.timestamp
    let uniqueId = concat(event.params._proposalId, event.params._voter).toHex()
    store.set('Vote', uniqueId, vote as Vote)
}
