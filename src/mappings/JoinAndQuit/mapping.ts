import {
  JoinInProposal,
  ProposalExecuted,
  RageQuit,
  RedeemReputation,
  Refund,
} from '../../types/JoinAndQuit/JoinAndQuit';

import * as domain from '../../domain';

// Import entity types generated from the GraphQL schema
import { BigInt } from '@graphprotocol/graph-ts';
import { JoinAndQuitProposal, RageQuitted, Refunded } from '../../types/schema';
import { eventId, save } from '../../utils';

function insertNewProposal(event: JoinInProposal): void {
  let proposal = new JoinAndQuitProposal(event.params._proposalId.toHex());
  proposal.dao = event.params._avatar.toHex();
  proposal.proposedMember = event.params._proposedMember;
  proposal.funding = event.params._feeAmount;
  proposal.executed = false;
  proposal.reputationMinted = BigInt.fromI32(0);

  save(proposal, 'JoinAndQuitProposal', event.block.timestamp);
}

export function handleNewJoinAndQuitProposal(
  event: JoinInProposal,
): void {
  domain.handleNewJoinAndQuitProposal(
    event.params._avatar,
    event.params._proposalId,
    event.block.timestamp,
    event.params._descriptionHash,
    event.address);

  insertNewProposal(event);
}

export function handleProposalExecuted(
  event: ProposalExecuted,
): void {
  let proposal = JoinAndQuitProposal.load(event.params._proposalId.toHex());
  if (proposal != null) {
    proposal.executed = true;
    save(proposal, 'JoinAndQuitProposal', event.block.timestamp);
  }
}

export function handleRedeemReputation(
  event: RedeemReputation,
): void {
  let proposal = JoinAndQuitProposal.load(event.params._proposalId.toHex());
  if (proposal != null) {
    proposal.reputationMinted = event.params._amount;
    save(proposal, 'JoinAndQuitProposal', event.block.timestamp);
  }
}

export function handleRageQuit(
  event: RageQuit,
): void {
  let rageQuitted = new RageQuitted(eventId(event));
  rageQuitted.dao = event.params._avatar.toHex();
  rageQuitted.rageQuitter = event.params._rageQuitter;
  rageQuitted.refund = event.params._refund;

  save(rageQuitted, 'RageQuitted', event.block.timestamp);
}

export function handleRefund(
  event: Refund,
): void {
  let refund = new Refunded(eventId(event));
  refund.dao = event.params._avatar.toHex();
  refund.beneficiary = event.params._beneficiary;
  refund.refund = event.params._refund;

  save(refund, 'Refunded', event.block.timestamp);
}
