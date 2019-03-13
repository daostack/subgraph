import { BigInt, Bytes } from '@graphprotocol/graph-ts';
import { GPQueue } from '../types/schema';

export function getGPQueue(id: string): GPQueue {
  let gPQue = GPQueue.load(id) ;
  if (gPQue == null) {
    gPQue = new GPQueue(id);
  }
  return gPQue as GPQueue;
}

export function updateThreshold(dao: string,
                                threshold: BigInt,
                                paramsHash: Bytes,
                                organizationId: Bytes): void {
  let gPQue = getGPQueue(organizationId.toHex());
  gPQue.threshold =  threshold;
  gPQue.paramsHash = paramsHash;
  gPQue.dao = dao;
  gPQue.save();
}
