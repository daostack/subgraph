import 'allocator/arena';

import { Address, BigInt, Bytes, store } from '@graphprotocol/graph-ts';

// Import event types from the Reputation contract ABI
import {
} from '../../types/ContributionReward/ContributionReward';

import * as domain from '../../domain';

// Import entity types generated from the GraphQL schema
import {
} from '../../types/schema';
import { equals, eventId } from '../../utils';

export function handleNewSchemeProposal(event: NewSchemeProposal): void {
  let ent = NewSchemeProposal.load(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.avatar = event.params._avatar;
  ent.proposalId = event.params._proposalId;
  ent.scheme = event.params._scheme;
  ent.paramsHash = event.params._paramsHash;
  ent.permission = event.params._permission;
  ent.descriptionHash = event.params._descriptionHash;
  ent.votingMachine = event.params._votingMachine;

  //need to fill up other fileds.
  ent.save();
  insertNewProposalRegister(ent.avatr,
                            ent.proposalId,
                            ent.scheme,
                            ent.paramsHash,
                            ent.permission);

    domain.handleNewSchemeRegisterProposal(ent.proposalId,
                                           event.block.timestamp,
                                           ent.avatar,
                                           ent.votingMachine,
                                           ent.descriptionHash);
}

export function handleRemoveSchemeProposal(event: RemoveSchemeProposal): void {
  let ent = RemoveSchemeProposal.load(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.avatar = event.params._avatar;
  ent.proposalId = event.params._proposalId;
  ent.descriptionHash = event.params._descriptionHash;
  ent.votingMachine = event.params._votingMachine;
  //need to fill up other fileds.
  ent.save();
  domain.handleNewSchemeRegisterProposal(ent.proposalId,
                                         event.block.timestamp,
                                         ent.avatar,
                                         ent.votingMachine,
                                         ent.descriptionHash);
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let ent = SRProposalExecuted.load(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.avatar = event.params._avatar;
  ent.proposalId = event.params._proposalId;
  ent.decision = event.params._decision;
    //need to fill up other fileds.
  ent.save();
}

function insertNewProposalRegister(avatar: Bytes,proposalId:Bytes,scheme:Bytes,paramsHash:Bytes,permission:Bytes): void {
  let ent = SchemeRegistrarProposal.load(proposalId.toHex());
  ent.dao = avatar;
  ent.schemeToRegister = scheme;
	ent.schemeToRegisterParamsHash =  paramsHash;
	ent.permission =  permission;
  ent.schemeToRemove = null;
  //need to fill up other fileds.
  ent.save();
}

function insertNewProposalUnRegister(avatar: Bytes,proposalId:Bytes,scheme:Bytes): void {
  let ent = SchemeRegistrarProposal.load(proposalId.toHex());
  ent.dao = avatar;
  ent.schemeToRemove = scheme;
  ent.schemeToRegister = null;
  //need to fill up other fileds.
  ent.save();
}

function updateProposalExecution(proposalId:Bytes,decision:BigInt): void {
  let ent = SchemeRegistrarProposal.load(proposalId.toHex());
  ent.decision = decision;
  if (ent.schemeToRegister != null) {
    ent.schemeRegistered = true;
  } else {
    ent.schemeRemoved = true;
  }
  //need to fill up other fileds.
  ent.save();
}
