import {
  TokenTradeProposed,
  ProposalExecuted,
  TokenTradeProposalExecuted,
} from "../../types/TokenTrade/TokenTrade";
import * as domain from "../../domain";
import { TokenTradeProposal } from '../../types/schema';

function insertNewProposal(event: TokenTradeProposed): void {
  let proposal = new TokenTradeProposal(event.params._proposalId.toHex());
  proposal.dao = event.params._avatar.toHex();

  proposal.beneficiary = event.params._beneficiary;
  proposal.sendTokenAddress = event.params._sendTokenAddress;
  proposal.sendTokenAmount = event.params._sendTokenAmount;
  proposal.receiveTokenAddress = event.params._receiveTokenAddress;
  proposal.receiveTokenAmount = event.params._receiveTokenAmount;

  proposal.executed = false;
  proposal.redeemed = false;

  proposal.save();
}

export function handleProposalCreation(
  event: TokenTradeProposed
): void {
  domain.handleNewTokenTradeProposal(
    event.params._avatar,
    event.params._proposalId,
    event.params._descriptionHash,
    event.params._beneficiary,
    event.params._sendToken,
    event.params._sendTokenAmount,
    event.params._receiveToken,
    event.params._receiveTokenAmount  
  );

  insertNewProposal(event);
}

export function handleProposalRedemption(
  event: TokenTradeProposalExecuted
): void {
  let proposal = TokenTradeProposal.load(event.params._proposalId.toHex());
  if (proposal != null && proposal.executed) {
    proposal.redeemed = true;
    proposal.save();
  }
}

export function handleProposalExecution(
  event: ProposalExecuted
): void {
  let proposal = TokenTradeProposal.load(event.params._proposalId.toHex());
  if (proposal != null) {
    proposal.executed = true;
    proposal.save();
  }
}
