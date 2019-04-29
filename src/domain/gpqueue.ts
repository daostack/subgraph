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
  gpQueue.votingMachine = gpAddress;
  gpQueue.scheme = scheme;
  gpQueue.dao = dao;
  gpQueue.save();
}
