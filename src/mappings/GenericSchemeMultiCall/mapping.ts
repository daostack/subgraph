import { Bytes, store } from '@graphprotocol/graph-ts';

// Import event types from the Reputation contract ABI
import {
  NewMultiCallProposal,
  ProposalCallExecuted,
  ProposalExecuted,
} from '../../types/GenericSchemeMultiCall/GenericSchemeMultiCall';

import * as domain from '../../domain';

// Import entity types generated from the GraphQL schema
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
    ent.returnValues.push(event.params._callDataReturnValue);
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
  }

  store.set('GenericSchemeMultiCallProposal', event.params._proposalId.toHex(), ent);
}
