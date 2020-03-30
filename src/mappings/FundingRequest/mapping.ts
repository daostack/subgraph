import {
  NewFundingProposal,
  ProposalExecuted,
  Redeem,
} from '../../types/FundingRequest/FundingRequest';

import * as domain from '../../domain';

// Import entity types generated from the GraphQL schema
import { BigInt } from '@graphprotocol/graph-ts';
import { FundingRequestProposal } from '../../types/schema';

function insertNewProposal(event: NewFundingProposal): void {
  let proposal = new FundingRequestProposal(event.params._proposalId.toHex());
  proposal.dao = event.params._avatar.toHex();
  proposal.beneficiary = event.params._beneficiary;
  proposal.amount = event.params._amount;
  proposal.executed = false;
  proposal.amountRedeemed = BigInt.fromI32(0);

  proposal.save();
}

export function handleNewFundingRequestProposal(
  event: NewFundingProposal,
): void {
  domain.handleNewFundingRequestProposal(
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
  let proposal = FundingRequestProposal.load(event.params._proposalId.toHex());
  if (proposal != null) {
    proposal.executed = true;
    proposal.save();
  }
}

export function handleRedeem(
  event: Redeem,
): void {
  let proposal = FundingRequestProposal.load(event.params._proposalId.toHex());
  if (proposal != null) {
    proposal.amountRedeemed = event.params._amount;
    proposal.save();
  }
}
