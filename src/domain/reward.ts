import { Address, BigInt, Bytes , crypto, log, store} from '@graphprotocol/graph-ts';
import { GenesisProtocol } from '../types/GenesisProtocol/GenesisProtocol';
import { ContractInfo,
         ContributionRewardProposal,
         ControllerScheme,
         GPReward,
         GPRewardsHelper,
         PreGPReward,
         Proposal} from '../types/schema';
import { concat , equalsBytes , equalStrings, save } from '../utils';
import { addRedeemableRewardOwner, getProposal, removeRedeemableRewardOwner, saveProposal } from './proposal';

function getGPRewardsHelper(proposalId: string): GPRewardsHelper {
    let gpRewardsHelper = GPRewardsHelper.load(proposalId);
    if (gpRewardsHelper == null) {
        gpRewardsHelper = new GPRewardsHelper(proposalId);
        // tslint:disable-next-line: ban-types
        gpRewardsHelper.gpRewards = new Array<string>();
    }
    return gpRewardsHelper as GPRewardsHelper;
}

export function insertGPRewardsToHelper(proposalId: Bytes, beneficiary: Address, timestamp: BigInt): void {
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
  if (i == gpRewards.length) { // not exist
      updatePreGPReward(rewardId, beneficiary, timestamp);
      gpRewards.push(rewardId);
      gpRewardsHelper.gpRewards = gpRewards;
      save(gpRewardsHelper as GPRewardsHelper, 'GPRewardsHelper', timestamp);
   }
}

export function daoBountyRedemption(proposalId: Bytes, beneficiary: Address , timestamp: BigInt): void {
   let id = crypto.keccak256(concat(proposalId, beneficiary)).toHex();
   let reward = store.get('GPReward', id) as GPReward | null;
   if (reward == null) {
     return;
   }
   reward.daoBountyForStakerRedeemedAt = timestamp;
   save(reward as GPReward, 'GPReward', timestamp);
   if (shouldRemoveAccountFromUnclaimed(reward as GPReward)) {
      removeRedeemableRewardOwner(proposalId, beneficiary, timestamp);
   }
}

export function tokenRedemption(proposalId: Bytes, beneficiary: Address, timestamp: BigInt): void {
   let id = crypto.keccak256(concat(proposalId, beneficiary)).toHex();
   let reward = store.get('GPReward', id) as GPReward | null;
   if (reward == null) {
     return;
   }
   reward.tokensForStakerRedeemedAt = timestamp;
   save(reward as GPReward, 'GPReward', timestamp);
   if (shouldRemoveAccountFromUnclaimed(reward as GPReward)) {
    removeRedeemableRewardOwner(proposalId, beneficiary, timestamp);
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

   save(reward as GPReward, 'GPReward', timestamp);
   if (shouldRemoveAccountFromUnclaimed(reward as GPReward)) {
      removeRedeemableRewardOwner(proposalId, beneficiary, timestamp);
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
    reward.reputationForVoterRedeemedAt.isZero() == false) &&
     (reward.reputationForProposer == null ||
        reward.reputationForProposerRedeemedAt.isZero() == false) &&
        (reward.tokensForStaker == null ||
          reward.tokensForStakerRedeemedAt.isZero() == false) &&
          (reward.daoBountyForStaker == null ||
            reward.daoBountyForStakerRedeemedAt.isZero() == false)
     );
}

export function shouldRemoveContributorFromUnclaimed(proposal: ContributionRewardProposal): boolean {
  let contractInfo = ContractInfo.load(proposal.beneficiary.toHex());
  if (contractInfo != null && equalStrings(contractInfo.name, 'ContributionRewardExt')) {
    return (
      (proposal.nativeTokenReward.isZero() ||
      (proposal.alreadyRedeemedNativeTokenPeriods !== null)) &&
      (proposal.externalTokenReward.isZero() ||
      (proposal.alreadyRedeemedExternalTokenPeriods !== null)) &&
      (proposal.ethReward.isZero() ||
      (proposal.alreadyRedeemedEthPeriods !== null))
    );
   }
  // Note: This doesn't support the period feature of ContributionReward
  return (
    (proposal.reputationReward.isZero() ||
    (proposal.alreadyRedeemedReputationPeriods !== null &&
      BigInt.compare(proposal.alreadyRedeemedReputationPeriods as BigInt, proposal.periods) == 0)) &&
    (proposal.nativeTokenReward.isZero() ||
    (proposal.alreadyRedeemedNativeTokenPeriods !== null &&
    BigInt.compare(proposal.alreadyRedeemedNativeTokenPeriods as BigInt, proposal.periods) == 0)) &&
    (proposal.externalTokenReward.isZero() ||
    (proposal.alreadyRedeemedExternalTokenPeriods !== null &&
    BigInt.compare(proposal.alreadyRedeemedExternalTokenPeriods as BigInt, proposal.periods) == 0)) &&
    (proposal.ethReward.isZero() ||
    (proposal.alreadyRedeemedEthPeriods !== null &&
    BigInt.compare(proposal.alreadyRedeemedEthPeriods as BigInt, proposal.periods) == 0)));
}

export function insertGPRewards(
  proposalId: Bytes,
  timestamp: BigInt,
  gpAddress: Address,
  state: number,
): void {
  let proposal = getProposal(proposalId.toHex());
  let genesisProtocol = GenesisProtocol.bind(gpAddress);
  let i = 0;
  let gpRewards: string[] = getGPRewardsHelper(proposalId.toHex()).gpRewards as string[];
  let controllerScheme = ControllerScheme.load(proposal.scheme.toString());
  if ((proposal.contributionReward !== null && equalStrings(proposal.winningOutcome, 'Pass')) && state !== 1) {
    let contributionRewardProposal = ContributionRewardProposal.load(proposal.contributionReward.toString());
    addRedeemableRewardOwner(proposal, contributionRewardProposal.beneficiary);
  }
  for (i = 0; i < gpRewards.length; i++) {
    let gpReward = PreGPReward.load(gpRewards[i]);
    if (gpReward == null) { continue; }
    let redeemValues: BigInt[];
    redeemValues[0] = BigInt.fromI32(0);
    redeemValues[1] = BigInt.fromI32(0);
    redeemValues[2] = BigInt.fromI32(0);
    let daoBountyForStaker: BigInt = BigInt.fromI32(0);

    if (controllerScheme !== null && controllerScheme.isRegistered) {
        let callResult = genesisProtocol.try_redeem(proposalId, gpReward.beneficiary as Address);
        if (callResult.reverted) {
            log.info('genesisProtocol try_redeem reverted', []);
        } else {
            redeemValues = callResult.value;
        }
        if (state == 2) {// call redeemDaoBounty only on execute
           let callResultRedeemDaoBounty =
           genesisProtocol.try_redeemDaoBounty(proposalId, gpReward.beneficiary as Address);
           if (callResultRedeemDaoBounty.reverted) {
              log.info('genesisProtocol try_redeemDaoBounty reverted', []);
           } else {
               daoBountyForStaker = callResultRedeemDaoBounty.value.value1;
           }
        }
    }
    if (!redeemValues[0].isZero() ||
        !redeemValues[1].isZero() ||
        !redeemValues[2].isZero() ||
        !daoBountyForStaker.isZero()) {
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
        if (idx == accountsWithUnclaimedRewards.length) {
          addRedeemableRewardOwner(proposal, gpReward.beneficiary);
        }
    } else {
      // remove the gpReward entity
      store.remove('PreGPReward', gpReward.id);
    }
  }
  store.remove('GPRewardsHelper' , proposalId.toHex());
  saveProposal(proposal, timestamp);
}

function updateGPReward(id: string,
                        beneficiary: Bytes,
                        proposalId: string,
                        tokensForStaker: BigInt,
                        reputationForVoter: BigInt,
                        reputationForProposer: BigInt,
                        daoBountyForStaker: BigInt,
                        gpAddress: Bytes,
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
      if (reputationForVoter.isZero() == false) {
          reward.reputationForVoter = reputationForVoter;
      }
      if (tokensForStaker.isZero() == false) {
          reward.tokensForStaker = tokensForStaker;
      }
      if (reputationForProposer.isZero() == false) {
          reward.reputationForProposer = reputationForProposer;
      }
      if (daoBountyForStaker.isZero() == false) {
          reward.daoBountyForStaker = daoBountyForStaker;
          let genesisProtocol = GenesisProtocol.bind(gpAddress as Address);
          reward.tokenAddress = genesisProtocol.stakingToken();
      }
      save(reward, 'GPReward', createdAt);
      return reward;
}

function updatePreGPReward(id: string, beneficiary: Bytes, timestamp: BigInt): PreGPReward {
  let reward = new PreGPReward(id);
  reward.beneficiary = beneficiary;

  save(reward, 'PreGPReward', timestamp);
  return reward;
}
