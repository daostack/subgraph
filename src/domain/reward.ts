import { Address, BigInt, Bytes , crypto, EthereumValue, SmartContract , store} from '@graphprotocol/graph-ts';
import { GenesisProtocol__voteInfoResult } from '../types/GenesisProtocol/GenesisProtocol';
import { GenesisProtocol } from '../types/GenesisProtocol/GenesisProtocol';
import { GPReward, ProposalStake, ProposalVote } from '../types/schema';
import { concat } from '../utils';
import { getProposal } from './proposal';

export function daoBountyRedemption(proposalId: Bytes, beneficiary: Address): void {
   let id = crypto.keccak256(concat(proposalId, beneficiary)).toHex();
   let reward = store.get('GPReward', id) as GPReward;
   reward.redeemedDaoBountyForStaker = true;
   saveGPReward(reward);
}

export function tokenRedemption(proposalId: Bytes, beneficiary: Address): void {
   let id = crypto.keccak256(concat(proposalId, beneficiary)).toHex();
   let reward = store.get('GPReward', id) as GPReward;
   reward.redeemedTokensForStaker = true;
   saveGPReward(reward);
}

export function reputationRedemption(proposalId: Bytes, beneficiary: Address): void {
   let id = crypto.keccak256(concat(proposalId, beneficiary)).toHex();
   let reward = store.get('GPReward', id) as GPReward;
   if (reward.reputationForProposer !== BigInt.fromI32(0)) {
       reward.redeemedReputationForProposer = true;
   }
   if (reward.reputationForVoter !== BigInt.fromI32(0)) {
       reward.redeemedReputationForVoter = true;
   }
   saveGPReward(reward);
}

export function insertGPRewards(
  proposalId: Bytes,
  timestamp: BigInt,
  gpAddress: Address,
): void {
  let proposal = getProposal(proposalId.toHex());
  let voters: string[] = proposal.votes as string[];
  let genesisProtocolExt = GenesisProtocolExt.bind(gpAddress);
  let i = 0;
  let rewardId: string;
  for (i = 0; i < voters.length; i++) {
    let proposalVote = store.get('ProposalVote', voters[i]) as ProposalVote;
    rewardId = crypto.keccak256(concat(proposalId, proposalVote.voter)).toHex();
    let reputationForVoter = genesisProtocolExt.redeem(proposalId, proposalVote.voter as Address)[1];
    if (reputationForVoter.toString() !== '0') {
        updateGPReward(rewardId,
                     proposalVote.voter,
                     proposal.id,
                     reputationForVoter,
                     BigInt.fromI32(0),
                     BigInt.fromI32(0),
                     BigInt.fromI32(0),
                     gpAddress,
                     proposal.dao,
                     timestamp,
                  );
    }
  }

  let stakers: string[] = proposal.stakes as string[];
  for (i = 0; i < stakers.length; i++) {
    let proposalStake = store.get('ProposalStake', stakers[i]) as ProposalStake;
    rewardId = crypto.keccak256(concat(proposalId, proposalStake.staker)).toHex();
    let tokensForStaker = genesisProtocolExt.redeem(proposalId, proposalStake.staker as Address)[0];
    let daoBountyForStaker = genesisProtocolExt.redeemDaoBounty(proposalId, proposalStake.staker as Address).value1;
    if (tokensForStaker.toString() !== '0' || daoBountyForStaker.toString() !== '0') {

      updateGPReward(rewardId,
                   proposalStake.staker,
                   proposal.id,
                   BigInt.fromI32(0),
                   tokensForStaker,
                   BigInt.fromI32(0),
                   daoBountyForStaker,
                   gpAddress,
                   proposal.dao,
                   timestamp,
                );
    }
  }
  rewardId = crypto.keccak256(concat(proposalId, proposal.proposer)).toHex();
  let reputationForProposer = genesisProtocolExt.redeem(proposalId, proposal.proposer as Address)[2];
  if (reputationForProposer.toString() !== '0') {
      updateGPReward(rewardId,
                   proposal.proposer,
                   proposal.id,
                   BigInt.fromI32(0),
                   BigInt.fromI32(0),
                   reputationForProposer,
                   BigInt.fromI32(0),
                   gpAddress,
                   proposal.dao,
                   timestamp,
                );
  }
}

function updateGPReward(id: string,
                        beneficiary: Bytes,
                        proposalId: string,
                        reputationForVoter: BigInt,
                        tokensForStaker: BigInt,
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
        reward.redeemedTokensForStaker = false;
        reward.redeemedReputationForVoter = false;
        reward.redeemedReputationForProposer = false;
        reward.redeemedDaoBountyForStaker = false;
      }
      if (reputationForVoter.toString() !== '0') {
          reward.reputationForVoter = reputationForVoter;
      }
      if (tokensForStaker.toString() !== '0') {
          reward.tokensForStaker = tokensForStaker;
      }
      if (reputationForProposer.toString() !== '0') {
          reward.reputationForProposer = reputationForProposer;
      }
      if (daoBountyForStaker.toString() !== '0')  {
          reward.daoBountyForStaker = daoBountyForStaker;
          let genesisProtocol = GenesisProtocol.bind(gpAddress as Address);
          reward.tokenAddress = genesisProtocol.stakingToken();
      }
      saveGPReward(reward);
      return  reward;
}

export function saveGPReward(reward: GPReward): void {
   store.set('GPReward', reward.id, reward);
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
