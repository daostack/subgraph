import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts';
import { GenesisProtocol } from '../types/GenesisProtocol/GenesisProtocol';
import { GPQueue } from '../types/schema';
import { equalStrings } from '../utils';

export function getGPQueue(id: string): GPQueue {
  let gpQueue = GPQueue.load(id) ;
  if (gpQueue == null) {
    gpQueue = new GPQueue(id);
    gpQueue.votingMachine = null;
    gpQueue.scheme = '';
  }
  return gpQueue as GPQueue;
}

export function updateThreshold(dao: string,
                                gpAddress: Address,
                                threshold: BigInt,
                                paramsHash: Bytes,
                                organizationId: Bytes,
                                scheme: string ): void {
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
    gpQueue.scheme = scheme;
  }
  gpQueue.dao = dao;
  gpQueue.save();
}
