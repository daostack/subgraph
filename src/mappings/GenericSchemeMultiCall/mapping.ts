import { store } from '@graphprotocol/graph-ts';

// Import event types from the Reputation contract ABI
import {
  GenericSchemeMultiCall,
  NewMultiCallProposal,
  ProposalExecuted,
  ProposalCallExecuted
} from '../../types/GenericSchemeMultiCall/GenericSchemeMultiCall';

import * as domain from '../../domain';

// Import entity types generated from the GraphQL schema
import {
  GenericSchemeMultiCallProposal,
} from '../../types/schema';

function insertNewProposal(event: NewMultiCallProposal): void {
  let ent = new GenericSchemeMultiCallProposal(event.params._proposalId.toHex());
  ent.dao = event.params._avatar.toHex();
  ent.callData = event.params._callData;
  ent.value = event.params._value;
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

export function handleProposalExecuted(
  event: ProposalExecuted,
): void {
  let ent = store.get('GenericSchemeMultiCallProposal', event.params._proposalId.toHex()) as GenericSchemeMultiCallProposal;
  if (ent != null) {
    ent.executed = true;
  }

  store.set('GenericSchemeMultiCallProposal', event.params._proposalId.toHex(), ent);
}

export function handleProposalCallExecuted(
  event: ProposalCallExecuted,
): void {
  let ent = store.get('GenericSchemeMultiCallProposal', event.params._proposalId.toHex()) as GenericSchemeMultiCallProposal;
  if (ent != null) {
    ent.executed = true;
    ent.contractToCall = event.params._contractToCall;
    ent.success = event.params._success;
    ent.returnValue = event.params._callDataReturnValue;
  }

  store.set('GenericSchemeMultiCallProposal', event.params._proposalId.toHex(), ent);
}
