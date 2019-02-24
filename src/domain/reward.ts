import { Address, BigInt, Bytes , crypto, EthereumValue, SmartContract , store} from '@graphprotocol/graph-ts';
import { GenesisProtocol__voteInfoResult } from '../types/GenesisProtocol/GenesisProtocol';
import { GenesisProtocol } from '../types/GenesisProtocol/GenesisProtocol';
import { GPReward, GPRewardsHelper } from '../types/schema';
import { concat , debug , equals } from '../utils';
import { getProposal } from './proposal';

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
       if ((gpRewards as string[])[i]  === rewardId) {
           break;
       }
  }
  if (i === gpRewards.length) { // not exist
      updateGPReward(rewardId,
                   beneficiary,
                   proposalId.toHex(),
                   BigInt.fromI32(0),
                   BigInt.fromI32(0),
                   BigInt.fromI32(0),
                   BigInt.fromI32(0),
                   new Address(),
                   getProposal(proposalId.toHex()).dao,
                   timestamp,
                );
      gpRewards.push(rewardId);
      gpRewardsHelper.gpRewards = gpRewards;
      gpRewardsHelper.save();
   }
}

export function daoBountyRedemption(proposalId: Bytes, beneficiary: Address , timestamp: BigInt): void {
   let id = crypto.keccak256(concat(proposalId, beneficiary)).toHex();
   let reward = store.get('GPReward', id) as GPReward;
   reward.redeemedDaoBountyForStaker = timestamp;
   reward.save();
}

export function tokenRedemption(proposalId: Bytes, beneficiary: Address, timestamp: BigInt): void {
   let id = crypto.keccak256(concat(proposalId, beneficiary)).toHex();
   let reward = store.get('GPReward', id) as GPReward;
   reward.redeemedTokensForStaker = timestamp;
   reward.save();
}

export function reputationRedemption(proposalId: Bytes, beneficiary: Address, timestamp: BigInt): void {
   let id = crypto.keccak256(concat(proposalId, beneficiary)).toHex();
   let reward = store.get('GPReward', id) as GPReward;

   if (reward.reputationForProposer != null) {
       reward.redeemedReputationForProposer = timestamp;
   }
   if (reward.reputationForVoter != null) {
       reward.redeemedReputationForVoter = timestamp;
   }

   reward.save();
}

export function insertGPRewards(
  proposalId: Bytes,
  timestamp: BigInt,
  gpAddress: Address,
): void {
  let proposal = getProposal(proposalId.toHex());
  let genesisProtocolExt = GenesisProtocolExt.bind(gpAddress);
  let i = 0;
  let gpRewards: string[] = getGPRewardsHelper(proposalId.toHex()).gpRewards as string[];
  for (i = 0; i < gpRewards.length; i++) {
    let gpReward = GPReward.load(gpRewards[i]);
    let redeemValues = genesisProtocolExt.redeem(proposalId, gpReward.beneficiary as Address);
    let daoBountyForStaker = genesisProtocolExt.redeemDaoBounty(proposalId, gpReward.beneficiary as Address).value1;
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
    } else {
      // remove the gpReward entity
      store.remove('GPReward', gpReward.id);
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
        reward.redeemedTokensForStaker = BigInt.fromI32(0);
        reward.redeemedReputationForVoter = BigInt.fromI32(0);
        reward.redeemedReputationForProposer = BigInt.fromI32(0);
        reward.redeemedDaoBountyForStaker = BigInt.fromI32(0);
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
      return  reward;
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
