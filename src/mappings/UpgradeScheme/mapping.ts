import {
  NewUpgradeProposal,
  ProposalExecuted,
} from '../../types/UpgradeScheme/UpgradeScheme';

import * as domain from '../../domain';

// Import entity types generated from the GraphQL schema
import { BigInt, Bytes } from '@graphprotocol/graph-ts';
import {
  ContractInfo, UpgradeSchemeProposal,
} from '../../types/schema';

function insertNewProposal(event: NewUpgradeProposal): void {
  let proposal = new UpgradeSchemeProposal(event.params._proposalId.toHex());
  proposal.dao = event.params._avatar.toHex();
  proposal.packageVersion = event.params._packageVersion;
  proposal.contractsNames = event.params._contractsNames;
  proposal.contractsToUpgrade = event.params._contractsToUpgrade as Bytes[];
  proposal.descriptionHash = event.params._descriptionHash;
  proposal.executed = false;

  proposal.save();
}

export function handleNewUpgradeProposal(
  event: NewUpgradeProposal,
): void {
  domain.handleNewUpgradeProposal(
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
  let proposal = UpgradeSchemeProposal.load(event.params._proposalId.toHex());
  if (proposal != null) {
    proposal.executed = true;
    if (event.params._decision) {
      for (let i = 0; i < proposal.contractsNames.length; i++) {
          let contractInfo = ContractInfo.load((proposal.contractsToUpgrade as Bytes[])[i].toHex());
          if (contractInfo != null) {
            let version = proposal.packageVersion as BigInt[];
            let v0Int: BigInt;
            let v1Int: BigInt;
            let v2Int: BigInt;
            if (version[0] != null) {
              v0Int = version[0] as BigInt;
            } else {
              v0Int = BigInt.fromI32(0);
            }
            if (version[1] != null) {
              v1Int = version[1] as BigInt;
            } else {
              v1Int = BigInt.fromI32(0);
            }
            if (version[2] != null) {
              v2Int = version[2] as BigInt;
            } else {
              v2Int = BigInt.fromI32(0);
            }
            let v0 = v0Int.toString();
            let v1 = v1Int.toString();
            let v2 = v2Int.toString();
            // 0.1.1-rc.11
            contractInfo.version = v0 + '.' + v1 + '.' + v1 + '-rc.' + v2;
            contractInfo.name = (proposal.contractsNames as Bytes[])[i].toString();
            contractInfo.save();
          }
      }
    }
    proposal.save();
  }
}
