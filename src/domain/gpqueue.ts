import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts';
import { GenesisProtocol } from '../types/GenesisProtocol/GenesisProtocol';
import { GPQueue } from '../types/schema';
import { debug } from '../utils';

export function getGPQueue(id: string): GPQueue {
  let gpQueue = GPQueue.load(id) ;
  if (gpQueue == null) {
    gpQueue = new GPQueue(id);
    gpQueue.votingMachine = null;
    gpQueue.queuedProposalsCount = BigInt.fromI32(0);
    gpQueue.preBoostedProposalsCount = BigInt.fromI32(0);
    gpQueue.boostedProposalsCount = BigInt.fromI32(0);
  }
  return gpQueue as GPQueue;
}

export function updateThreshold(dao: string,
                                gpAddress: Address,
                                threshold: BigInt,
                                paramsHash: Bytes,
                                organizationId: Bytes): void {
  let gpQueue = getGPQueue(organizationId.toHex());
  gpQueue.threshold =  threshold;
  gpQueue.paramsHash = paramsHash;

  if (gpQueue.votingMachine == null) {
    let gp = GenesisProtocol.bind(gpAddress);
    let params = gp.parameters(paramsHash);
    gpQueue.votingMachine = gpAddress;
    gpQueue.queuedVoteRequiredPercentage = params.value0; // queuedVoteRequiredPercentage
    gpQueue.queuedVotePeriodLimit = params.value1; // queuedVotePeriodLimit
    gpQueue.boostedVotePeriodLimit = params.value2; // boostedVotePeriodLimit
    gpQueue.preBoostedVotePeriodLimit = params.value3; // preBoostedVotePeriodLimit
    gpQueue.thresholdConst = params.value4; // thresholdConst
    gpQueue.limitExponentValue = params.value5; // limitExponentValue
    gpQueue.quietEndingPeriod = params.value6; // quietEndingPeriod
    gpQueue.proposingRepReward = params.value7;
    gpQueue.votersReputationLossRatio = params.value8; // votersReputationLossRatio
    gpQueue.minimumDaoBounty = params.value9; // minimumDaoBounty
    gpQueue.daoBountyConst = params.value10; // daoBountyConst
    gpQueue.activationTime = params.value11; // activationTime
    gpQueue.voteOnBehalf = params.value12; // voteOnBehalf
  }
  gpQueue.dao = dao;
  gpQueue.save();
}

export function setScheme(
  organizationId: Bytes,
  scheme: string): void {
  let gpQueue = getGPQueue(organizationId.toHex());
  gpQueue.scheme = scheme;
  gpQueue.save();
}

export function countProposalInQueue(
  organizationId: Bytes,
  previousState: number,
  state: number,
): void {
  let gpQueue = getGPQueue(organizationId.toHex());
  if (state === 1 || state === 2) {
    // Closed or Executed
    if (previousState === 3) {
      gpQueue.queuedProposalsCount = gpQueue.queuedProposalsCount.minus(BigInt.fromI32(1));
    } else if (previousState === 4) {
      gpQueue.preBoostedProposalsCount = gpQueue.preBoostedProposalsCount.minus(BigInt.fromI32(1));
    } else if (previousState === 5 || previousState === 6) {
      gpQueue.boostedProposalsCount = gpQueue.boostedProposalsCount.minus(BigInt.fromI32(1));
    }
  } else if (state === 3) {
    // Queued
    gpQueue.queuedProposalsCount = gpQueue.queuedProposalsCount.plus(BigInt.fromI32(1));
    if (previousState === 4) {
      gpQueue.preBoostedProposalsCount = gpQueue.preBoostedProposalsCount.minus(BigInt.fromI32(1));
    }
  } else if (state === 4) {
    // PreBoosted
    if (previousState === 3) {
      gpQueue.queuedProposalsCount = gpQueue.queuedProposalsCount.minus(BigInt.fromI32(1));
    }
    gpQueue.preBoostedProposalsCount = gpQueue.preBoostedProposalsCount.plus(BigInt.fromI32(1));
  } else if (state === 5) {
    // Boosted
    gpQueue.preBoostedProposalsCount = gpQueue.preBoostedProposalsCount.minus(BigInt.fromI32(1));
    gpQueue.boostedProposalsCount = gpQueue.boostedProposalsCount.plus(BigInt.fromI32(1));
  }
  gpQueue.save();
}
