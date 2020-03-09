import { store } from '@graphprotocol/graph-ts';

// Import event types from the Reputation contract ABI
import {
  GenericScheme,
  NewCallProposal,
  ProposalExecuted,
} from '../../types/GenericScheme/GenericScheme';

import * as domain from '../../domain';

const signalContract = '0x0000000000000000000000000000000000000001';

// Import entity types generated from the GraphQL schema
import {
  GenericSchemeParam,
  GenericSchemeProposal,
  Proposal,
} from '../../types/schema';
import { debug } from '../../utils';

function insertNewProposal(event: NewCallProposal): void {
  let genericSchemeParams = GenericSchemeParam.load(event.address.toHex());
  let ent = new GenericSchemeProposal(event.params._proposalId.toHex());
  ent.dao = event.params._avatar.toHex();
  ent.contractToCall = genericSchemeParams.contractToCall;
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
    debug('in first if of generic');
  }
  if (ent.contractToCall.toHex() == signalContract) {
    debug('in 2nd if of generic');
    let proposal = store.get('Proposal', event.params._proposalId.toHex()) as Proposal;
    debug('Proposal ' + proposal.winningOutcome);
    let signalId = event.params._avatar.toHex();
    let descriptionHash = proposal.descriptionHash;
    domain.addSignal(signalId, descriptionHash);
  }

  store.set('GenericSchemeProposal', event.params._proposalId.toHex(), ent);
}
