// Required for dynamic memory allocation in WASM / AssemblyScript
import 'allocator/arena';

import { Address, BigInt, Bytes, Entity, store, Value} from '@graphprotocol/graph-ts';
import {
  NewContributionProposal,
  ProposalExecuted,
} from '../types/ContributionReward/ContributionReward';
import { Transfer } from '../types/DAOToken/DAOToken';
import { NewCallProposal } from '../types/GenericScheme/GenericScheme';
import {
  ExecuteProposal,
  GPExecuteProposal,
  NewProposal,
  Stake,
  StateChange,
  VoteProposal,
} from '../types/GenesisProtocol/GenesisProtocol';
import { Burn, Mint } from '../types/Reputation/Reputation';
import { GenesisProtocolProposal, Proposal, ReputationContract, ReputationHolder } from '../types/schema';
import { RegisterScheme } from '../types/UController/UController';
import { equals, equalsBytes, eventId, hexToAddress } from '../utils';
import * as daoModule from './dao';
import { updateMemberReputation, updateMemberReputationWithValue , updateMemberTokens } from './member';
import {
  getProposal,
  parseOutcome,
  saveProposal,
  updateCRProposal,
  updateGPProposal,
  updateGSProposal,
  updateProposal,
  updateProposalconfidence,
  updateProposalExecution,
  updateProposalExecutionState,
  updateProposalState,
  updateSRProposal,
} from './proposal';
import {
  getReputation,
  insertReputation,
  updateReputationTotalSupply,
} from './reputation';
import {
  daoBountyRedemption,
  insertGPRewards,
  insertGPRewardsToHelper ,
  reputationRedemption ,
  tokenRedemption,
} from './reward';
import { insertStake } from './stake';
import { getToken, insertToken, updateTokenTotalSupply } from './token';
import { insertVote } from './vote';

function handleGPProposalPrivate(proposalId: string ): void {
   let gpProposal = GenesisProtocolProposal.load(proposalId);
   if (gpProposal != null) {
     updateGPProposal(
       gpProposal.address as Address,
       gpProposal.proposalId,
       gpProposal.proposer as Address,
       gpProposal.daoAvatarAddress as Address,
       gpProposal.paramsHash,
       gpProposal.submittedTime,
     );
     insertGPRewardsToHelper(gpProposal.proposalId, gpProposal.proposer as Address);
   }
}

export function handleNewContributionProposal(
  event: NewContributionProposal,
): void {

  handleGPProposalPrivate(event.params._proposalId.toHex());
  updateCRProposal(
    event.params._proposalId,
    event.block.timestamp,
    event.params._avatar,
    event.params._intVoteInterface,
    event.params._descriptionHash,
  );
}

export function handleNewSchemeRegisterProposal(
   proposalId: string,
   timestamp: BigInt,
   avatar: Bytes,
   votingMachine: Bytes,
   descriptionHash: string,
 ): void {
    handleGPProposalPrivate(proposalId);
    updateSRProposal(
      proposalId,
      timestamp,
      avatar as Address,
      votingMachine as Address,
      descriptionHash,
    );
 }

export function handleNewCallProposal(
  event: NewCallProposal,
): void {
  handleGPProposalPrivate(event.params._proposalId.toHex());
  updateGSProposal(
    event.params._proposalId,
    event.block.timestamp,
    event.params._avatar,
    event.params._descriptionHash,
  );
}

export function handleStake(event: Stake): void {
  let proposal = getProposal(event.params._proposalId.toHex());
  updateProposal(proposal, event.address, event.params._proposalId);
  if (equals(event.params._vote, BigInt.fromI32(1))) {
    proposal.stakesFor = proposal.stakesFor.plus(event.params._amount);
  } else {
    proposal.stakesAgainst = proposal.stakesAgainst.plus(event.params._amount);
  }

  saveProposal(proposal);
  insertStake(
    eventId(event),
    event.block.timestamp,
    event.params._staker,
    event.params._amount,
    event.params._proposalId.toHex(),
    event.params._organization.toHex(),
    parseOutcome(event.params._vote),
  );
  insertGPRewardsToHelper(event.params._proposalId, event.params._staker);
}

export function handleVoteProposal(event: VoteProposal): void {
  let proposal = getProposal(event.params._proposalId.toHex());
  updateProposal(proposal, event.address, event.params._proposalId);
  if (equals(event.params._vote, BigInt.fromI32(1))) {
    proposal.votesFor = proposal.votesFor.plus(event.params._reputation);
  } else {
    proposal.votesAgainst = proposal.votesAgainst.plus(
      event.params._reputation,
    );
  }
  saveProposal(proposal);
  insertVote(
    eventId(event),
    event.block.timestamp,
    event.params._voter,
    event.params._proposalId.toHex(),
    event.params._organization.toHex(),
    parseOutcome(event.params._vote),
    event.params._reputation,
  );
  insertGPRewardsToHelper(event.params._proposalId, event.params._voter);
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  // this already handled at handleExecuteProposal
  // updateProposalExecution(event.params._proposalId, null, event.block.timestamp,event.address);
}

export function confidenceLevelUpdate(proposalId: Bytes, confidenceThreshold: BigInt): void {
  updateProposalconfidence(proposalId, confidenceThreshold);
}

export function handleRegisterScheme(avatar: Address,
                                     nativeTokenAddress: Address,
                                     nativeReputationAddress: Address): void {
  // Detect the first register scheme event which indicates a new DAO
  let isFirstRegister = store.get(
    'FirstRegisterSchemeFlag',
    avatar.toHex(),
  );
  if (isFirstRegister == null) {
    let dao = daoModule.insertNewDAO(avatar, nativeTokenAddress , nativeReputationAddress);
    insertToken(hexToAddress(dao.nativeToken), avatar.toHex());
    insertReputation(
      hexToAddress(dao.nativeReputation),
      avatar.toHex(),
    );
    // the following code handle cases where the reputation and token minting are done before the dao creation
    // (e.g using daocreator)
    // get reputation contract
    let repContract = store.get('ReputationContract', dao.nativeReputation) as ReputationContract;
    let holders: string[] = repContract.reputationHolders as string[];
    for (let i = 0; i < holders.length; i++) {
      let reputationHolder = store.get('ReputationHolder', holders[i]) as ReputationHolder;
      updateMemberReputationWithValue(reputationHolder.address as Address,
                                      avatar,
                                      reputationHolder.balance);
      updateMemberTokens(reputationHolder.address as Address, avatar);
    }
    updateTokenTotalSupply(hexToAddress(dao.nativeToken));
    let ent = new Entity();
    ent.set('id', Value.fromString(avatar.toHex()));
    store.set('FirstRegisterSchemeFlag', avatar.toHex(), ent);
  }
}

export function handleMint(event: Mint): void {
  let rep = getReputation(event.address.toHex());
  if (rep.dao == null) {
    // reputation that's not attached to a DAO
    return;
  }

  updateMemberReputation(event.params._to, hexToAddress(rep.dao));
  updateReputationTotalSupply(event.address);
}

export function handleBurn(event: Burn): void {
  let dao = getReputation(event.address.toHex()).dao;
  if (dao == null) {
    // reputation that's not attached to a DAO
    return;
  }
  updateMemberReputation(event.params._from, hexToAddress(dao));
  updateReputationTotalSupply(event.address);
}

export function handleNativeTokenTransfer(event: Transfer): void {
  let dao = getToken(event.address.toHex()).dao;
  if (dao == null) {
    // reputation that's not attached to a DAO
    return;
  }

  updateMemberTokens(event.params.from, hexToAddress(dao));
  updateMemberTokens(event.params.to, hexToAddress(dao));
  updateTokenTotalSupply(event.address);
}

export function handleExecuteProposal(event: ExecuteProposal): void {
   updateProposalExecution(event.params._proposalId, event.params._totalReputation, event.block.timestamp);
}

export function handleStateChange(event: StateChange): void {
  let p = Proposal.load(event.params._proposalId.toHex());
  if ((p != null) && (equalsBytes(p.paramsHash, new Bytes()) === false)) {
      updateProposalState(event.params._proposalId, event.params._proposalState, event.address);
      if ((event.params._proposalState === 1) ||
          (event.params._proposalState === 2)) {
          insertGPRewards(event.params._proposalId, event.block.timestamp, event.address, event.params._proposalState);
      }
  }

}

export function handleExecutionStateChange(event: GPExecuteProposal): void {
  updateProposalExecutionState(event.params._proposalId.toHex(), event.params._executionState);
}

export function handleGPRedemption(proposalId: Bytes, beneficiary: Address , timestamp: BigInt , type: string): void {
   let p = Proposal.load(proposalId.toHex());
   if ((p != null) && (equalsBytes(p.paramsHash, new Bytes()) === false)) {
       if (type === 'token') {
           tokenRedemption(proposalId, beneficiary, timestamp);
       } else if (type === 'reputation') {
           reputationRedemption(proposalId, beneficiary, timestamp);
       } else {
           daoBountyRedemption(proposalId, beneficiary, timestamp);
       }
    }
}

export function daoRegister(dao: Address, tag: string): void {
   daoModule.register(dao, tag);
}
