import { Address, BigInt, Bytes, Entity, store, Value} from '@graphprotocol/graph-ts';
import { setContractsInfo } from '../contractsInfo';
import { GenesisProtocolProposal, Proposal, ReputationContract, ReputationHolder } from '../types/schema';
import { equalsBytes, hexToAddress } from '../utils';
import * as daoModule from './dao';
import {
  getProposal,
  parseOutcome,
  saveProposal,
  updateCRProposal,
  updateGPProposal,
  updateGSProposal,
  updateProposalAfterVote,
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

function isProposalValid(proposalId: string ): boolean {
  let p = Proposal.load(proposalId);
  return  ((p != null) && (equalsBytes(p.paramsHash, new Bytes(32)) === false));
}

function handleGPProposalPrivate(proposalId: string): void {
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
    updateProposalState(
      gpProposal.proposalId,
      3, // Queued
      gpProposal.address as Address,
    );
   }
}

export function handleNewContributionProposal(
  proposalId: Bytes,
  timestamp: BigInt,
  avatar: Address,
  intVoteInterface: Address,
  descriptionHash: string,
  beneficiary: Address,
  address: Address,
  ): void {
  if (!daoModule.exists(avatar)) {
    return;
  }
  handleGPProposalPrivate(proposalId.toHex());
  updateCRProposal(
    proposalId,
    timestamp,
    avatar,
    intVoteInterface,
    descriptionHash,
    beneficiary,
    address,
  );
}

export function handleNewSchemeRegisterProposal(
   proposalId: string,
   timestamp: BigInt,
   avatar: Bytes,
   votingMachine: Bytes,
   descriptionHash: string,
   schemeAddress: Address,
 ): void {
    if (!daoModule.exists(avatar as Address)) {
      return;
    }
    handleGPProposalPrivate(proposalId);
    updateSRProposal(
      proposalId,
      timestamp,
      avatar as Address,
      votingMachine as Address,
      descriptionHash,
      schemeAddress,
    );
 }

export function handleNewCallProposal(
  proposalId: Bytes,
  timestamp: BigInt,
  avatar: Address,
  descriptionHash: string,
  address: Address,
): void {
  if (!daoModule.exists(avatar)) {
    return;
  }
  handleGPProposalPrivate(proposalId.toHex());
  updateGSProposal(
    proposalId,
    timestamp,
    avatar,
    descriptionHash,
    address,
  );
}

export function handleStake(
    eventId: string,
    timestamp: BigInt,
    staker: Address,
    amount: BigInt,
    proposalId: Bytes,
    organization: Bytes,
    vote: BigInt,
): void {
  let proposal = getProposal(proposalId.toHex());
  if (equalsBytes(proposal.paramsHash, new Bytes(32))) {
    return;
  }
  if (vote.toI32() ===  1) {
    proposal.stakesFor = proposal.stakesFor.plus(amount);
  } else {
    proposal.stakesAgainst = proposal.stakesAgainst.plus(amount);
  }
  saveProposal(proposal);
  insertStake(
    eventId,
    timestamp,
    staker,
    amount,
    proposalId.toHex(),
    organization.toHex(),
    parseOutcome(vote),
  );
  insertGPRewardsToHelper(proposalId, staker);
}

export function handleVoteProposal(
  eventId: string,
  timestamp: BigInt,
  voter: Address,
  proposalId: Bytes,
  organization: Bytes,
  vote: BigInt,
  reputation: BigInt,
  address: Address,
): void {
  let proposal = getProposal(proposalId.toHex());

  if (equalsBytes(proposal.paramsHash, new Bytes(32))) {
    return;
  }
  updateProposalAfterVote(proposal, address, proposalId);
  if (vote.toI32() === 1) {
    proposal.votesFor = proposal.votesFor.plus(reputation);
  } else {
    proposal.votesAgainst = proposal.votesAgainst.plus(
      reputation,
    );
  }
  saveProposal(proposal);
  insertVote(
    eventId,
    timestamp,
    voter,
    proposalId.toHex(),
    organization.toHex(),
    parseOutcome(vote),
    reputation,
  );
  insertGPRewardsToHelper(proposalId, voter);
}

export function confidenceLevelUpdate(proposalId: Bytes, confidenceThreshold: BigInt): void {
  if (isProposalValid(proposalId.toHex())) {
      updateProposalconfidence(proposalId, confidenceThreshold);
  }
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
    setContractsInfo();
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
      addDaoMember(reputationHolder);
    }
    updateTokenTotalSupply(hexToAddress(dao.nativeToken));
    let ent = new Entity();
    ent.set('id', Value.fromString(avatar.toHex()));
    store.set('FirstRegisterSchemeFlag', avatar.toHex(), ent);
  }
}

export function handleMint(address: Address): void {
  let rep = getReputation(address.toHex());
  if (rep.dao == null) {
    // reputation that's not attached to a DAO
    return;
  }
  updateReputationTotalSupply(address);
}

export function handleBurn(address: Address): void {
  let dao = getReputation(address.toHex()).dao;
  if (dao == null) {
    // reputation that's not attached to a DAO
    return;
  }
  updateReputationTotalSupply(address);
}

export function handleNativeTokenTransfer(address: Address): void {
  let dao = getToken(address.toHex()).dao;
  if (dao == null) {
    // reputation that's not attached to a DAO
    return;
  }

  // updateMemberTokens(event.params.from, hexToAddress(dao));
  // updateMemberTokens(event.params.to, hexToAddress(dao));
  updateTokenTotalSupply(address);
}

export function handleExecuteProposal(
  proposalId: Bytes,
  totalReputation: BigInt,
  timestamp: BigInt,
): void {
   if (isProposalValid(proposalId.toHex())) {
       updateProposalExecution(proposalId, totalReputation, timestamp);
    }
}

export function handleStateChange(
  proposalId: Bytes,
  timestamp: BigInt,
  address: Address,
  proposalState: number,
): void {
  if (isProposalValid(proposalId.toHex())) {
      updateProposalState(proposalId, proposalState, address);
      if ((proposalState === 1) ||
          (proposalState === 2)) {
          insertGPRewards(proposalId, timestamp, address, proposalState);
      }
  }
}

export function handleExecutionStateChange(
  proposalId: Bytes,
  executionState: number,
): void {
  if (isProposalValid(proposalId.toHex())) {
    updateProposalExecutionState(proposalId.toHex(), executionState);
  }
}

export function handleGPRedemption(proposalId: Bytes, beneficiary: Address , timestamp: BigInt , type: string): void {
   if (isProposalValid(proposalId.toHex())) {
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

export function addDaoMember(reputationHolder: ReputationHolder): void {
  let dao = getReputation(reputationHolder.contract.toHex()).dao;
  if (dao == null) {
    // reputation that's not attached to a DAO
    return;
  }
  if (reputationHolder.dao == null) {
    reputationHolder.dao = dao;
    reputationHolder.save();
  }
  daoModule.increaseDAOmembersCount(dao);
}

export function removeDaoMember(reputationHolder: ReputationHolder): void {
   let dao = getReputation(reputationHolder.contract.toHex()).dao;
   if (dao == null) {
     // reputation that's not attached to a DAO
     return;
   }
   daoModule.decreaseDAOmembersCount(dao);
}
