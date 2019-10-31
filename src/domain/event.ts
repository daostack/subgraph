import { Address, BigInt, ByteArray, Bytes, crypto } from '@graphprotocol/graph-ts';
import { Event, Proposal, ReputationHolder } from '../types/schema';
import { concat } from '../utils';

export function addNewDAOEvent(avatar: Address, daoName: string, timestamp: BigInt): void {
    let eventType = 'NewDAO';

    let eventEnt = new Event(avatar.toHex());
    eventEnt.type = eventType;
    eventEnt.data = '{ "address": "' + avatar.toHex() + '", "name": "' + daoName + '" }';
    eventEnt.dao = avatar.toHex();
    eventEnt.timestamp = timestamp;

    eventEnt.save();
}

export function addProposalStateChangeEvent(proposalId: Bytes, timestamp: BigInt): void {
    let proposal = Proposal.load(proposalId.toHex());
    let eventType = 'ProposalStageChange';
    let eventEntId = crypto.keccak256(concat(proposalId, timestamp as ByteArray));

    let eventEnt = new Event(eventEntId.toHex());
    eventEnt.type = eventType;
    eventEnt.data = '{ "stage": "' + proposal.stage + '" }';
    eventEnt.proposal = proposal.id;
    eventEnt.dao = proposal.dao;
    eventEnt.timestamp = timestamp;

    eventEnt.save();
}

export function addNewReputationHolderEvent(reputationHolder: ReputationHolder): void {
    let eventType = 'NewReputationHolder';
    let eventEntId = crypto.keccak256(concat(reputationHolder.address, reputationHolder.createdAt as ByteArray));

    let event = new Event(eventEntId.toHex());
    event.type = eventType;
    event.data = '{ "reputationAmount": "' + reputationHolder.balance.toString() + '" }';
    event.user = reputationHolder.address;
    event.dao = reputationHolder.dao;
    event.timestamp = reputationHolder.createdAt;

    event.save();
}

export function addVoteFlipEvent(proposalId: Bytes, proposal: Proposal, timestamp: BigInt): void {
    let eventType = 'VoteFlip';
    let eventId = crypto.keccak256(
      concat(concat(proposalId, proposal.votesFor as ByteArray), proposal.votesAgainst as ByteArray),
      );

    let eventEnt = new Event(eventId.toHex());
    eventEnt.type = eventType;
    eventEnt.data = '{ "outcome": "' + proposal.winningOutcome + '", "votesFor": "' + proposal.votesFor.toString() + '", "votesAgainst": "' + proposal.votesAgainst.toString() + '" }';
    eventEnt.proposal = proposal.id;
    eventEnt.dao = proposal.dao;
    eventEnt.timestamp = timestamp;

    eventEnt.save();
}

export function addNewProposalEvent(proposalId: Bytes, proposal: Proposal, timestamp: BigInt): void {
    let eventType = 'NewProposal';
    let eventId = crypto.keccak256(concat(proposalId, timestamp as ByteArray));

    let event = new Event(eventId.toHex());
    event.type = eventType;
    event.data = '{ "title": "' + proposal.title + '" }';
    event.proposal = proposalId.toHex();
    event.user = proposal.proposer;
    event.dao = proposal.dao;
    event.timestamp = timestamp;

    event.save();
}

export function addStakeEvent(
    eventId: string,
    proposalId: string,
    outcome: string,
    amount: BigInt,
    staker: Address,
    daoId: string,
    timestamp: BigInt,
): void {
    let eventType = 'Stake';

    let eventEnt = new Event(eventId);
    eventEnt.type = eventType;
    eventEnt.data = '{ "outcome": "' + outcome + '", "stakeAmount": "' + amount.toString() + '" }';
    eventEnt.proposal = proposalId;
    eventEnt.user = staker;
    eventEnt.dao = daoId;
    eventEnt.timestamp = timestamp;

    eventEnt.save();
}

export function addVoteEvent(
    eventId: string,
    proposalId: string,
    outcome: string,
    reputation: BigInt,
    voter: Address,
    daoId: string,
    timestamp: BigInt,
): void {
    let eventType = 'Vote';

    let eventEnt = new Event(eventId);
    eventEnt.type = eventType;
    eventEnt.data = '{ "outcome": "' + outcome + '", "reputationAmount": "' + reputation.toString() + '" }';
    eventEnt.proposal = proposalId;
    eventEnt.user = voter;
    eventEnt.dao = daoId;
    eventEnt.timestamp = timestamp;

    eventEnt.save();
    }
