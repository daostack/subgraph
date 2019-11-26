import { store } from '@graphprotocol/graph-ts';
import { debug } from '../../utils';

// Import event types from the Reputation contract ABI
import {
  NewCallProposal,
  ProposalExecuted,
  UGenericScheme,
} from '../../types/UGenericScheme/UGenericScheme';

import * as domain from '../../domain';

// Import entity types generated from the GraphQL schema
import {
  GenericSchemeProposal,
} from '../../types/schema';

function insertNewProposal(event: NewCallProposal): void {
  let gs = UGenericScheme.bind(event.address);
  let ent = new GenericSchemeProposal(event.params._proposalId.toHex());
  ent.dao = event.params._avatar.toHex();
  ent.contractToCall = gs.getContractToCall(event.params._avatar);
  ent.callData = event.params._callData;
  ent.value = event.params._value;
  ent.executed = false;

  store.set('GenericSchemeProposal', event.params._proposalId.toHex(), ent);
}

export function handleNewCallProposal(
  event: NewCallProposal,
): void {

  domain.handleNewCallProposal(
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
  let ent = store.get('GenericSchemeProposal', event.params._proposalId.toHex()) as GenericSchemeProposal;
  if (ent != null) {
    ent.executed = true;
    ent.returnValue = event.params._genericCallReturnValue;
  }

  var signalId = event.params._avatar.toHex();
  var testmetastring = '{"signal": {"Header":"https://de.wikipedia.org/wiki/Wald#/media/Datei:Laurisilva_en_el_Cubo_de_la_Galga.jpg"}}';
  debug(testmetastring);

  domain.addSignal(signalId, testmetastring);
  store.set('GenericSchemeProposal', event.params._proposalId.toHex(), ent);
}
