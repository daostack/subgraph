import { Address, BigInt, Bytes , crypto, EthereumValue, SmartContract , store} from '@graphprotocol/graph-ts';
import { ContributionRewardProposal, GPReward, GPRewardsHelper, PreGPReward, Proposal } from '../types/schema';
import {
  concat,
  equals,
  equalsBytes,
  equalStrings,
  getGPExtRedeem,
  getGPExtRedeemDaoBounty,
  getGPStakingToken,
} from '../utils';
import { addRedeemableRewardOwner, getProposal, removeRedeemableRewardOwner } from './proposal';

function getGPRewardsHelper(proposalId: string): GPRewardsHelper {
    let gpRewardsHelper = GPRewardsHelper.load(proposalId);
    if (gpRewardsHelper == null) {
        gpRewardsHelper = new GPRewardsHelper(proposalId);
        // tslint:disable-next-line: ban-types
        gpRewardsHelper.gpRewards = new Array<string>();
    }
    return gpRewardsHelper as GPRewardsHelper;
}

export function insertGPRewardsToHelper(proposalId: Bytes, beneficiary: Address): void {
  let rewardId = crypto.keccak256(concat(proposalId, beneficiary)).toHex();
  let gpRewardsHelper = getGPRewardsHelper(proposalId.toHex());
  let gpRewards = gpRewardsHelper.gpRewards;
  // check if already exist
  let i = 0;
  for (i; i < gpRewards.length; i++) {
       if (equalStrings((gpRewards as string[])[i], rewardId)) {
           break;
       }
  }
  if (i === gpRewards.length) { // not exist
      updatePreGPReward(rewardId, beneficiary);
      gpRewards.push(rewardId);
      gpRewardsHelper.gpRewards = gpRewards;
      gpRewardsHelper.save();
   }
}

export function daoBountyRedemption(proposalId: Bytes, beneficiary: Address , timestamp: BigInt): void {
   let id = crypto.keccak256(concat(proposalId, beneficiary)).toHex();
   let reward = store.get('GPReward', id) as GPReward | null;
   if (reward == null) {
     return;
   }
   reward.daoBountyForStakerRedeemedAt = timestamp;
   reward.save();
   if (shouldRemoveAccountFromUnclaimed(reward as GPReward)) {
      removeRedeemableRewardOwner(proposalId, beneficiary);
   }
}

export function tokenRedemption(proposalId: Bytes, beneficiary: Address, timestamp: BigInt): void {
   let id = crypto.keccak256(concat(proposalId, beneficiary)).toHex();
   let reward = store.get('GPReward', id) as GPReward | null;
   if (reward == null) {
     return;
   }
   reward.tokensForStakerRedeemedAt = timestamp;
   reward.save();
   if (shouldRemoveAccountFromUnclaimed(reward as GPReward)) {
    removeRedeemableRewardOwner(proposalId, beneficiary);
   }
}

export function reputationRedemption(proposalId: Bytes, beneficiary: Address, timestamp: BigInt): void {
   let id = crypto.keccak256(concat(proposalId, beneficiary)).toHex();
   let reward = store.get('GPReward', id) as GPReward | null;
   if (reward == null) {
     return;
   }

   if (reward.reputationForProposer != null) {
       reward.reputationForProposerRedeemedAt = timestamp;
   }
   if (reward.reputationForVoter != null) {
       reward.reputationForVoterRedeemedAt = timestamp;
   }

   reward.save();
   if (shouldRemoveAccountFromUnclaimed(reward as GPReward)) {
      removeRedeemableRewardOwner(proposalId, beneficiary);
   }
}

export function shouldRemoveAccountFromUnclaimed(reward: GPReward): boolean {
  let proposal = ContributionRewardProposal.load(reward.proposal);
  if (proposal !== null) {
    if (equalsBytes(proposal.beneficiary, reward.beneficiary)) {
      if (!shouldRemoveContributorFromUnclaimed(proposal as ContributionRewardProposal)) {
        return false;
      }
    }
  }

  return ((reward.reputationForVoter == null ||
    equals(reward.reputationForVoterRedeemedAt, BigInt.fromI32(0)) === false) &&
     (reward.reputationForProposer == null ||
        equals(reward.reputationForProposerRedeemedAt, BigInt.fromI32(0)) === false) &&
        (reward.tokensForStaker == null ||
          equals(reward.tokensForStakerRedeemedAt, BigInt.fromI32(0)) === false) &&
          (reward.daoBountyForStaker == null ||
            equals(reward.daoBountyForStakerRedeemedAt, BigInt.fromI32(0)) === false)
     );
}

export function shouldRemoveContributorFromUnclaimed(proposal: ContributionRewardProposal): boolean {
  if (
    (equals(proposal.reputationReward, BigInt.fromI32(0)) ||
    (proposal.alreadyRedeemedReputationPeriods !== null &&
      equals(proposal.alreadyRedeemedReputationPeriods as BigInt, proposal.periods))) &&
    (equals(proposal.nativeTokenReward, BigInt.fromI32(0)) ||
    (proposal.alreadyRedeemedNativeTokenPeriods !== null &&
    equals(proposal.alreadyRedeemedNativeTokenPeriods as BigInt, proposal.periods))) &&
    (equals(proposal.externalTokenReward, BigInt.fromI32(0)) ||
    (proposal.alreadyRedeemedExternalTokenPeriods !== null &&
    equals(proposal.alreadyRedeemedExternalTokenPeriods as BigInt, proposal.periods))) &&
    (equals(proposal.ethReward, BigInt.fromI32(0)) ||
    (proposal.alreadyRedeemedEthPeriods !== null &&
    equals(proposal.alreadyRedeemedEthPeriods as BigInt, proposal.periods)))) {
      // Note: This doesn't support the period feature of ContributionReward
      return false;
  }

  return true;
}

export function insertGPRewards(
  proposalId: Bytes,
  timestamp: BigInt,
  gpAddress: Address,
  state: number,
): void {
  let proposal = getProposal(proposalId.toHex());
  let i = 0;
  let gpRewards: string[] = getGPRewardsHelper(proposalId.toHex()).gpRewards as string[];
  for (i = 0; i < gpRewards.length; i++) {
    let gpReward = PreGPReward.load(gpRewards[i]);
    let redeemValues = getGPExtRedeem(gpAddress, proposalId, gpReward.beneficiary as Address);
    let daoBountyForStaker: BigInt;
    if (state === 2) {// call redeemDaoBounty only on execute
       daoBountyForStaker = getGPExtRedeemDaoBounty(
         gpAddress, proposalId,
         gpReward.beneficiary as Address,
         ).get('value1').toBigInt();
    }
    if (!equals(redeemValues[0], BigInt.fromI32(0)) ||
        !equals(redeemValues[1], BigInt.fromI32(0)) ||
        !equals(redeemValues[2], BigInt.fromI32(0)) ||
        !equals(daoBountyForStaker, BigInt.fromI32(0))) {
        updateGPReward(gpReward.id,
                     gpReward.beneficiary,
                     proposal.id,
                     redeemValues[0],
                     redeemValues[1],
                     redeemValues[2],
                     daoBountyForStaker,
                     gpAddress,
                     proposal.dao,
                     timestamp,
                  );
        let idx = 0;
        let accountsWithUnclaimedRewards: Bytes[] =
           proposal.accountsWithUnclaimedRewards as Bytes[];
        for (idx; idx < accountsWithUnclaimedRewards.length; idx++) {
            if (equalsBytes(accountsWithUnclaimedRewards[idx], gpReward.beneficiary)) {
              break;
            }
        }
        if (idx === accountsWithUnclaimedRewards.length) {
          addRedeemableRewardOwner(proposal, gpReward.beneficiary);
        }
    } else {
      // remove the gpReward entity
      store.remove('PreGPReward', gpReward.id);
    }
  }
  store.remove('GPRewardsHelper' , proposalId.toHex());
  proposal.save();
}

function updateGPReward(id: string,
                        beneficiary: Bytes,
                        proposalId: string,
                        tokensForStaker: BigInt,
                        reputationForVoter: BigInt,
                        reputationForProposer: BigInt,
                        daoBountyForStaker: BigInt,
                        gpAddress: Address,
                        dao: string,
                        createdAt: BigInt,
                        ): GPReward {
      let reward = store.get('GPReward', id) as GPReward;
      if (reward == null) {
        reward = new GPReward(id);
        reward.beneficiary = beneficiary;
        reward.proposal = proposalId;
        reward.dao = dao;
        reward.createdAt = createdAt;
        reward.tokensForStakerRedeemedAt = BigInt.fromI32(0);
        reward.reputationForVoterRedeemedAt = BigInt.fromI32(0);
        reward.reputationForProposerRedeemedAt = BigInt.fromI32(0);
        reward.daoBountyForStakerRedeemedAt = BigInt.fromI32(0);
      }
      if (equals(reputationForVoter, BigInt.fromI32(0)) === false) {
          reward.reputationForVoter = reputationForVoter;
      }
      if (equals(tokensForStaker, BigInt.fromI32(0)) === false) {
          reward.tokensForStaker = tokensForStaker;
      }
      if (equals(reputationForProposer, BigInt.fromI32(0)) === false) {
          reward.reputationForProposer = reputationForProposer;
      }
      if (equals(daoBountyForStaker, BigInt.fromI32(0)) === false) {
          reward.daoBountyForStaker = daoBountyForStaker;
          reward.tokenAddress = getGPStakingToken(gpAddress);
      }
      reward.save();
      return reward;
}

function updatePreGPReward(id: string, beneficiary: Bytes): PreGPReward {
  let reward = new PreGPReward(id);
  reward.beneficiary = beneficiary;

  reward.save();
  return reward;
}
