import { BigInt, Bytes } from '@graphprotocol/graph-ts';
import { GPQue } from '../types/schema';

export function getGPQue(id: string): GPQue {
  let gPQue = GPQue.load(id) ;
  if (gPQue == null) {
    gPQue = new GPQue(id);
  }
  return gPQue as GPQue;
}

export function updateThreshold(dao: string,
                                threshold: BigInt,
                                paramsHash: Bytes,
                                organizationId: Bytes): void {
  let gPQue = getGPQue(organizationId.toString());
  gPQue.threshold =  threshold;
  gPQue.paramsHash = paramsHash;
  gPQue.dao = dao;
  gPQue.save();
}
