import "allocator/arena";
export { allocate_memory };

import {
  BigInt,
  store,
  crypto,
  ByteArray,
  Bytes,
  Address
} from "@graphprotocol/graph-ts";

import {
  GPExecuteProposal,
  Stake,
  Redeem,
  RedeemDaoBounty,
  RedeemReputation,
  NewProposal,
  ExecuteProposal,
  VoteProposal
} from "../../types/GenesisProtocol/GenesisProtocol";

import { concat, addition } from "../../utils";

import {
  GenesisProtocolProposal,
  GenesisProtocolVote,
  GenesisProtocolStake,
  GenesisProtocolRedemption,
  GenesisProtocolReward
} from "../../types/schema";

export function handleNewProposal(event: NewProposal): void {
  let ent = new GenesisProtocolProposal();
  ent.proposalId = event.params._proposalId.toHex();
  ent.submittedTime = event.block.timestamp;
  ent.proposer = event.params._proposer;
  ent.daoAvatarAddress = event.params._organization;
  ent.numOfChoices = event.params._numOfChoices;

  store.set("GenesisProtocolProposal", event.params._proposalId.toHex(), ent);
}

export function handleVoteProposal(event: VoteProposal): void {
  let ent = new GenesisProtocolVote();
  let uniqueId = concat(event.params._proposalId, event.params._voter).toHex();

  let vote = store.get("GenesisProtocolVote", uniqueId) as GenesisProtocolVote;
  if (vote == null) {
    ent.avatarAddress = event.params._organization;
    ent.reputation = event.params._reputation;
    ent.voterAddress = event.params._voter;
    ent.voteOption = event.params._vote;
    ent.proposalId = event.params._proposalId.toHex();
  } else {
    // Is it possible someone will use 50% for one voteOption and rest for the other
    vote.reputation = addition(vote.reputation, event.params._reputation);
    store.set("GenesisProtocolVote", uniqueId, vote);
    return;
  }

  store.set("GenesisProtocolVote", uniqueId, ent);
}

export function handleStake(event: Stake): void {
  let ent = new GenesisProtocolStake();
  let uniqueId = concat(event.params._proposalId, event.params._staker).toHex();

  let stake = store.get("GenesisProtocolStake", uniqueId) as GenesisProtocolStake;

  if (stake == null) {
    ent.avatarAddress = event.params._organization;
    ent.stakeAmount = event.params._amount;
    ent.stakerAddress = event.params._staker;
    ent.prediction = event.params._vote;
    ent.proposalId = event.params._proposalId.toHex();
  } else {
    // Is it possible someone will use 50% for one voteOption and rest for the other
    stake.stakeAmount = addition(stake.stakeAmount, event.params._amount);
    store.set("GenesisProtocolStake", uniqueId, stake);
    return;
  }

  store.set("GPStake", uniqueId, ent);
}

export function handleGPExecuteProposal(event: GPExecuteProposal): void {
  let proposal = store.get(
    "GenesisProtocolProposal",
    event.params._proposalId.toHex()
  ) as GenesisProtocolProposal;

  proposal.state = event.params._executionState;
  store.set("GenesisProtocolProposal", event.params._proposalId.toHex(), proposal);
}

export function handleExecuteProposal(event: ExecuteProposal): void {
  let proposal = store.get(
    "GenesisProtocolProposal",
    event.params._proposalId.toHex()
  ) as GenesisProtocolProposal;

  proposal.executionTime = event.block.timestamp;
  proposal.decision = event.params._decision;
  proposal.totalReputation = event.params._totalReputation;
  store.set("GenesisProtocolProposal", event.params._proposalId.toHex(), proposal);
}

export function handleRedeem(event: Redeem): void {
  let rewardType = new Uint8Array(1);
  rewardType[0] = 5;
  updateRedemption(
    event.params._beneficiary,
    event.params._organization,
    event.params._amount,
    event.params._proposalId,
    rewardType as ByteArray,
    "gpGen"
  );
}

export function handleRedeemDaoBounty(event: RedeemDaoBounty): void {
  let rewardType = new Uint8Array(1);
  rewardType[0] = 6;
  updateRedemption(
    event.params._beneficiary,
    event.params._organization,
    event.params._amount,
    event.params._proposalId,
    rewardType as ByteArray,
    "gpBounty"
  );
}

export function handleRedeemReputation(event: RedeemReputation): void {
  let rewardType = new Uint8Array(1);
  rewardType[0] = 4;
  updateRedemption(
    event.params._beneficiary,
    event.params._organization,
    event.params._amount,
    event.params._proposalId,
    rewardType as ByteArray,
    "gpRep"
  );
}

function updateRedemption(
  beneficiary: Address,
  avatar: Address,
  amount: BigInt,
  proposalId: Bytes,
  rewardType: ByteArray,
  rewardString: String
): void {
  let accountId = crypto.keccak256(concat(beneficiary, avatar));

  let rewardId = crypto.keccak256(concat(rewardType, amount as ByteArray));

  let uniqueId = crypto
    .keccak256(concat(proposalId, concat(accountId, rewardId)))
    .toHex();

  let redemption = store.get("GenesisProtocolRedemption", uniqueId) as GenesisProtocolRedemption;
  if (redemption == null) {
    redemption = new GenesisProtocolRedemption();
    redemption.redeemer = beneficiary;
    redemption.proposalId = proposalId.toHex();
    redemption.rewardId = rewardId.toHex();
    store.set("GenesisProtocolRedemption", uniqueId, redemption);
  }

  let reward = store.get("GenesisProtocolReward", rewardId.toHex()) as GenesisProtocolReward;
  if (reward == null) {
    reward = new GenesisProtocolReward();
    reward.id = rewardId.toHex();
    reward.type = rewardString.toString();
    reward.amount = amount;

    store.set("GenesisProtocolReward", rewardId.toHex(), reward);
  }
}
