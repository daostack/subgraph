import { Address, BigInt, Bytes , crypto, EthereumValue, SmartContract , store} from '@graphprotocol/graph-ts';
import { GenesisProtocol__voteInfoResult } from '../types/GenesisProtocol/GenesisProtocol';
import { GenesisProtocol } from '../types/GenesisProtocol/GenesisProtocol';
import { GPReward, GPRewardsHelper, PreGPReward } from '../types/schema';
import { concat , equals, equalsBytes, equalStrings } from '../utils';
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

function shouldRemoveAccountFromUnclaimed(reward: GPReward): boolean {
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

export function insertGPRewards(
  proposalId: Bytes,
  timestamp: BigInt,
  gpAddress: Address,
  state: number,
): void {
  let proposal = getProposal(proposalId.toHex());
  let genesisProtocolExt = GenesisProtocolExt.bind(gpAddress);
  let i = 0;
  let gpRewards: string[] = getGPRewardsHelper(proposalId.toHex()).gpRewards as string[];
  for (i = 0; i < gpRewards.length; i++) {
    let gpReward = PreGPReward.load(gpRewards[i]);
    let redeemValues = genesisProtocolExt.redeem(proposalId, gpReward.beneficiary as Address);
    let daoBountyForStaker: BigInt;
    if (state === 2) {// call redeemDaoBounty only on execute
       daoBountyForStaker = genesisProtocolExt.redeemDaoBounty(proposalId, gpReward.beneficiary as Address).value1;
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
          getProposal(proposalId.toHex()).accountsWithUnclaimedRewards as Bytes[];
        for (idx; idx < accountsWithUnclaimedRewards.length; idx++) {
            if (equalsBytes(accountsWithUnclaimedRewards[idx], gpReward.beneficiary)) {
              break;
            }
        }
        if (idx === accountsWithUnclaimedRewards.length) {
          addRedeemableRewardOwner(proposalId, gpReward.beneficiary);
        }
    } else {
      // remove the gpReward entity
      store.remove('PreGPReward', gpReward.id);
    }
  }
  store.remove('GPRewardsHelper' , proposalId.toHex());
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
          let genesisProtocol = GenesisProtocol.bind(gpAddress as Address);
          reward.tokenAddress = genesisProtocol.stakingToken();
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

// this is a hack :)
export class GenesisProtocolExt extends SmartContract {
  public static bind(address: Address): GenesisProtocolExt {
    return new GenesisProtocolExt('GenesisProtocol', address);
  }

  public redeem(proposalId: Bytes, beneficiary: Address): BigInt[] {
    let result = super.call('redeem', [
      EthereumValue.fromFixedBytes(proposalId),
      EthereumValue.fromAddress(beneficiary),
    ]);
    return result[0].toBigIntArray();
  }

  public redeemDaoBounty(proposalId: Bytes, beneficiary: Address): GenesisProtocol__voteInfoResult {
    let result = super.call('redeemDaoBounty', [
      EthereumValue.fromFixedBytes(proposalId),
      EthereumValue.fromAddress(beneficiary),
    ]);
    return new GenesisProtocol__voteInfoResult(
      result[0].toBigInt(),
      result[1].toBigInt(),
    );
  }
}
