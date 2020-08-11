import {
  JoinInProposal,
  ProposalExecuted,
  RedeemReputation,
} from '../../types/Join/Join';

import * as domain from '../../domain';

// Import entity types generated from the GraphQL schema
import { BigInt } from '@graphprotocol/graph-ts';
import { JoinProposal } from '../../types/schema';
import { eventId } from '../../utils';

function insertNewProposal(event: JoinInProposal): void {
  let proposal = new JoinProposal(event.params._proposalId.toHex());
  proposal.dao = event.params._avatar.toHex();
  proposal.proposedMember = event.params._proposedMember;
  proposal.funding = event.params._feeAmount;
  proposal.executed = false;
  proposal.reputationMinted = BigInt.fromI32(0);

  proposal.save();
}

export function handleNewJoinProposal(
  event: JoinInProposal,
): void {
  domain.handleNewJoinProposal(
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
  let proposal = JoinProposal.load(event.params._proposalId.toHex());
  if (proposal != null) {
    proposal.executed = true;
    proposal.save();
  }
}

export function handleRedeemReputation(
  event: RedeemReputation,
): void {
  let proposal = JoinProposal.load(event.params._proposalId.toHex());
  if (proposal != null) {
    proposal.reputationMinted = event.params._amount;
    proposal.save();
  }
}
