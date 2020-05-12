import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts';

import {
  NewSchemeProposal,
  ProposalExecuted,
} from '../../types/SchemeFactory/SchemeFactory';

import * as domain from '../../domain';

// Import entity types generated from the GraphQL schema
import {
   SchemeFactoryNewSchemeProposal,
   SchemeFactoryProposal,
   SchemeFactoryProposalExecuted,
} from '../../types/schema';
import { equalsBytes, equalStrings, save } from '../../utils';

export function handleNewSchemeProposal(event: NewSchemeProposal): void {
  let ent = new SchemeFactoryNewSchemeProposal(event.params._proposalId.toHex());
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.avatar = event.params._avatar;
  ent.proposalId = event.params._proposalId;
  ent.schemeName = event.params._schemeName;
  ent.schemeData = event.params._schemeData;
  ent.packageVersion = event.params._packageVersion;
  ent.permission = event.params._permissions;
  ent.schemeToReplace = event.params._schemeToReplace;
  ent.descriptionHash = event.params._descriptionHash;
  ent.votingMachine = event.params._intVoteInterface;
  save(ent, 'SchemeFactoryNewSchemeProposal', event.block.timestamp);

  domain.handleNewSchemeFactoryProposal(event.params._proposalId.toHex(),
                                         event.block.timestamp,
                                         ent.avatar,
                                         ent.votingMachine,
                                         ent.descriptionHash,
                                         event.address);
  insertNewProposal(ent.avatar as Address,
                          ent.proposalId,
                          ent.schemeName,
                          ent.schemeData,
                          ent.packageVersion as BigInt[],
                          ent.permission,
                          ent.schemeToReplace as Address,
                          event.block.timestamp);
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let ent = new SchemeFactoryProposalExecuted(event.params._proposalId.toHex());
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.avatar = event.params._avatar;
  ent.proposalId = event.params._proposalId;
  ent.decision = event.params._param;
  save(ent, 'SchemeFactoryProposalExecuted', event.block.timestamp);
  updateProposalExecution(ent.proposalId,  ent.decision, event.block.timestamp);
}

function insertNewProposal(avatar: Address,
                           proposalId: Bytes,
                           schemeName: string,
                           schemeData: Bytes,
                           schemePackageVersion: BigInt[],
                           permissions: Bytes,
                           schemeToRemove: Address,
                           timestamp: BigInt): void {
  let ent = SchemeFactoryProposal.load(proposalId.toHex());
  if (ent == null) {
    ent = new SchemeFactoryProposal(proposalId.toHex());
  }
  ent.dao = avatar.toHex();
  ent.schemeToRegisterName = schemeName;
  ent.schemeToRegisterData = schemeData;
  ent.schemeToRegisterPackageVersion = schemePackageVersion;
  ent.schemeToRegisterPermission = permissions;
  ent.schemeToRemove = schemeToRemove;

  save(ent, 'SchemeFactoryProposal', timestamp);
}

function updateProposalExecution(proposalId: Bytes, decision: BigInt, timestamp: BigInt): void {
  let ent = SchemeFactoryProposal.load(proposalId.toHex());
  if (ent == null) {
    ent = new SchemeFactoryProposal(proposalId.toHex());
  }
  ent.decision = decision;
  if (!equalStrings(ent.schemeToRegisterName, '')) {
    ent.schemeRegistered = true;
  }

  if (!equalsBytes(ent.schemeToRemove as Bytes, Address.fromString('0x0000000000000000000000000000000000000000'))) {
    ent.schemeRemoved = true;
  }
  save(ent as SchemeFactoryProposal, 'SchemeFactoryProposal', timestamp);
}
