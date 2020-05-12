import { Address, BigInt, Bytes, store } from '@graphprotocol/graph-ts';

import {
  NewSchemeProposal,
  ProposalExecuted,
  RemoveSchemeProposal,
} from '../../types/SchemeRegistrar/SchemeRegistrar';

import * as domain from '../../domain';

// Import entity types generated from the GraphQL schema
import {
   SchemeRegistrarNewSchemeProposal,
   SchemeRegistrarProposal,
   SchemeRegistrarProposalExecuted,
   SchemeRegistrarRemoveSchemeProposal,
} from '../../types/schema';
import { eventId, save } from '../../utils';

export function handleNewSchemeProposal(event: NewSchemeProposal): void {
  let ent = SchemeRegistrarNewSchemeProposal.load(eventId(event));
  if (ent == null) {
    ent = new SchemeRegistrarNewSchemeProposal(eventId(event));
  }
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.avatar = event.params._avatar;
  ent.proposalId = event.params._proposalId;
  ent.scheme = event.params._scheme;
  ent.permission = event.params._permissions;
  ent.descriptionHash = event.params._descriptionHash;
  ent.votingMachine = event.params._intVoteInterface;
  // need to fill up other fileds.
  save(ent, 'SchemeRegistrarNewSchemeProposal', event.block.timestamp);

  domain.handleNewSchemeRegistrarProposal(event.params._proposalId.toHex(),
                                         event.block.timestamp,
                                         ent.avatar,
                                         ent.votingMachine,
                                         ent.descriptionHash,
                                         event.address);
  insertNewProposalRegister(ent.avatar as Address,
                          ent.proposalId,
                          ent.scheme,
                          ent.permission,
                          event.block.timestamp);
}

export function handleRemoveSchemeProposal(event: RemoveSchemeProposal): void {
  let ent = SchemeRegistrarRemoveSchemeProposal.load(eventId(event));
  if (ent == null) {
    ent = new SchemeRegistrarRemoveSchemeProposal(eventId(event));
  }
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.avatar = event.params._avatar;
  ent.proposalId = event.params._proposalId;
  ent.descriptionHash = event.params._descriptionHash;
  ent.votingMachine = event.params._intVoteInterface;
  ent.scheme = event.params._scheme;
  // need to fill up other fileds.
  save(ent, 'SchemeRegistrarRemoveSchemeProposal', event.block.timestamp);

  insertNewProposalUnRegister(ent.avatar as Address,
                              ent.proposalId,
                              ent.scheme,
                              event.block.timestamp);

  domain.handleNewSchemeRegistrarProposal(event.params._proposalId.toHex(),
                                         event.block.timestamp,
                                         ent.avatar,
                                         ent.votingMachine,
                                         ent.descriptionHash,
                                         event.address);
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let ent = SchemeRegistrarProposalExecuted.load(eventId(event));
  if (ent == null) {
    ent = new SchemeRegistrarProposalExecuted(eventId(event));
  }
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.avatar = event.params._avatar;
  ent.proposalId = event.params._proposalId;
  ent.decision = event.params._param;
  save(ent, 'SchemeRegistrarProposalExecuted', event.block.timestamp);
  updateProposalExecution(ent.proposalId,  ent.decision, event.block.timestamp);
}

function insertNewProposalRegister(avatar: Address,
                                   proposalId: Bytes,
                                   scheme: Bytes,
                                   permissions: Bytes,
                                   timestamp: BigInt): void {
  let ent = SchemeRegistrarProposal.load(proposalId.toHex());
  if (ent == null) {
    ent = new SchemeRegistrarProposal(proposalId.toHex());
  }
  ent.dao = avatar.toHex();
  ent.schemeToRegister = scheme;
  ent.schemeToRegisterPermission = permissions;
  save(ent, 'SchemeRegistrarProposal', timestamp);
}

function insertNewProposalUnRegister(avatar: Address, proposalId: Bytes, scheme: Bytes, timestamp: BigInt): void {
  let ent = SchemeRegistrarProposal.load(proposalId.toHex());
  if (ent == null) {
    ent = new SchemeRegistrarProposal(proposalId.toHex());
  }

  ent.dao = avatar.toHex();
  ent.schemeToRemove = scheme;
  save(ent, 'SchemeRegistrarProposal', timestamp);
}

function updateProposalExecution(proposalId: Bytes, decision: BigInt, timestamp: BigInt): void {
  let ent = SchemeRegistrarProposal.load(proposalId.toHex());
  if (ent == null) {
    ent = new SchemeRegistrarProposal(proposalId.toHex());
  }
  ent.decision = decision;
  if (ent.schemeToRegister != null) {
    ent.schemeRegistered = true;
  } else {
    ent.schemeRemoved = true;
  }
  save(ent, 'SchemeRegistrarProposal', timestamp);
}
