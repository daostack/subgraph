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
  let testId = 0;
  let idstring = BigInt.fromI32(testId).toHex();
  let sig = new Signal(idstring);
  sig.data = metadata;
  saveSignal(sig);
}
