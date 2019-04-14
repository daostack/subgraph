import { BigInt, Bytes } from '@graphprotocol/graph-ts';
import { GPQueue } from '../types/schema';

export function getGPQueue(id: string): GPQueue {
  let gpQueue = GPQueue.load(id) ;
  if (gpQueue == null) {
    gpQueue = new GPQueue(id);
  }
  return gpQueue as GPQueue;
}

export function updateThreshold(dao: string,
                                threshold: BigInt,
                                paramsHash: Bytes,
                                organizationId: Bytes): void {
  let gpQueue = getGPQueue(organizationId.toHex());
  gpQueue.threshold =  threshold;
  gpQueue.paramsHash = paramsHash;
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
    if (previousState === 0 || previousState === 3) {
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
    gpQueue.queuedProposalsCount = gpQueue.queuedProposalsCount.minus(BigInt.fromI32(1));
    gpQueue.preBoostedProposalsCount = gpQueue.preBoostedProposalsCount.plus(BigInt.fromI32(1));
  } else if (state === 5) {
    // Boosted
    gpQueue.preBoostedProposalsCount = gpQueue.preBoostedProposalsCount.minus(BigInt.fromI32(1));
    gpQueue.boostedProposalsCount = gpQueue.boostedProposalsCount.plus(BigInt.fromI32(1));
  }
  gpQueue.save();
}
