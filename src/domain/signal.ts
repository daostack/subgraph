import { Address, store, BigInt } from '@graphprotocol/graph-ts';
import { Signal } from '../types/schema';

export function getSignal(id: string): Signal {
  let sig = store.get('Signal', id) as Signal;
  if (sig == null) {
    sig = new Signal(id);
  }
  return sig;
}

export function saveSignal(signal: Signal): void {
  signal.save()
}

export function addMeta(signal: Signal, metadata: string): void {
  signal.data = metadata;
  saveSignal(signal);
}

export function testwritesignal(id: string, metadata: string): void {
  let sig = new Signal(id);
  sig.data = metadata;
  saveSignal(sig);
}
