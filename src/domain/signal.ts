import { Address, store, BigInt } from '@graphprotocol/graph-ts';
import { Signal } from '../types/schema';
import { getProposal } from './proposal'

export function getSignal(id: string): Signal {
  let sig = store.get('Signal', id) as Signal;
  if (sig == null) {
    sig = new Signal(id);
  }
  return sig;
}

function saveSignal(signal: Signal): void {
  signal.save()
}

function addMeta(signal: Signal, metadata: string): void {
  let proposal = getProposal(metadata);
  let instruction = proposal.title;
  let metadatavalues = proposal.description;
  signal.data = metadatavalues;
  saveSignal(signal);
}

export function writesignal(id: string, metadata: string): void {
  let signal = getSignal(id)
  addMeta(signal,metadata);

}
