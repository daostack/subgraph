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
