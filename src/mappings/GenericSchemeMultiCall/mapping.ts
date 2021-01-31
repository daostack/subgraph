import { BigInt, Bytes, store } from '@graphprotocol/graph-ts';

// Import event types from the Reputation contract ABI
import {
  NewMultiCallProposal,
  ProposalCallExecuted,
  ProposalExecuted,
} from '../../types/GenericSchemeMultiCall/GenericSchemeMultiCall';

import * as domain from '../../domain';

// Import entity types generated from the GraphQL schema
import { getProposal } from '../../domain/proposal';
import {
  GenericSchemeMultiCallProposal,
  GenericSchemeParam,
} from '../../types/schema';

function insertNewProposal(event: NewMultiCallProposal): void {
  let ent = new GenericSchemeMultiCallProposal(event.params._proposalId.toHex());
  ent.dao = event.params._avatar.toHex();
  ent.contractsToCall = event.params._contractsToCall as Bytes[];
  ent.callsData = event.params._callsData;
  ent.values = event.params._values;
  ent.executed = false;

  store.set('GenericSchemeMultiCallProposal', event.params._proposalId.toHex(), ent);
}

export function handleNewMultiCallProposal(
  event: NewMultiCallProposal,
): void {
  domain.handleNewMultiCallProposal(
    event.params._avatar,
    event.params._proposalId,
    event.block.timestamp,
    event.params._descriptionHash,
    event.address);

  insertNewProposal(event);
}

export function handleProposalCallExecuted(
  event: ProposalCallExecuted,
): void {
  let ent = store.get(
    'GenericSchemeMultiCallProposal', event.params._proposalId.toHex(),
  ) as GenericSchemeMultiCallProposal;
  if (ent != null) {
    let returnValues = ent.returnValues;
    if (returnValues == null) {
      returnValues = [];
    }
    returnValues.push(event.params._callDataReturnValue);
    ent.returnValues = returnValues;
  }

  store.set('GenericSchemeMultiCallProposal', event.params._proposalId.toHex(), ent);
}

export function handleProposalExecuted(
  event: ProposalExecuted,
): void {
  let ent = store.get(
    'GenericSchemeMultiCallProposal', event.params._proposalId.toHex(),
  ) as GenericSchemeMultiCallProposal;
  if (ent != null) {
    ent.executed = true;
    const CLOSING_AT_TIME_DECREASE_GSMC = 32000000;
    const CLOSING_AT_TIME_INCREASE = 2147483647;
    let proposal = getProposal(event.params._proposalId.toHex());
    proposal.closingAt = (
      BigInt.fromI32(CLOSING_AT_TIME_INCREASE).minus(
        proposal.closingAt.plus(BigInt.fromI32(CLOSING_AT_TIME_DECREASE_GSMC)),
      )
    ).times(BigInt.fromI32(100));
  }

  store.set('GenericSchemeMultiCallProposal', event.params._proposalId.toHex(), ent);
}
