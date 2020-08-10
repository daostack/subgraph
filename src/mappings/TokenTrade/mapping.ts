import * as domain from '../../domain';
import { TokenTradeProposal } from '../../types/schema';
import {
  ProposalExecuted,
  TokenTradeProposalExecuted,
  TokenTradeProposed,
} from '../../types/TokenTrade/TokenTrade';

function insertNewProposal(event: TokenTradeProposed): void {
  let proposal = new TokenTradeProposal(event.params._proposalId.toHex());
  proposal.dao = event.params._avatar.toHex();

  proposal.beneficiary = event.params._beneficiary;
  proposal.sendTokenAddress = event.params._sendToken;
  proposal.sendTokenAmount = event.params._sendTokenAmount;
  proposal.receiveTokenAddress = event.params._receiveToken;
  proposal.receiveTokenAmount = event.params._receiveTokenAmount;

  proposal.executed = false;
  proposal.redeemed = false;

  proposal.save();
}

export function handleProposalCreation(
  event: TokenTradeProposed,
): void {
  domain.handleNewTokenTradeProposal(
    event.params._avatar,
    event.params._proposalId,
    event.block.timestamp,
    event.params._descriptionHash,
    event.address,
  );

  insertNewProposal(event);
}

export function handleProposalRedemption(
  event: TokenTradeProposalExecuted,
): void {
  let proposal = TokenTradeProposal.load(event.params._proposalId.toHex());
  if (proposal != null && proposal.executed) {
    proposal.redeemed = true;
    proposal.save();
  }
}

export function handleProposalExecution(
  event: ProposalExecuted,
): void {
  let proposal = TokenTradeProposal.load(event.params._proposalId.toHex());
  if (proposal != null) {
    proposal.executed = true;
    proposal.save();
  }
}
