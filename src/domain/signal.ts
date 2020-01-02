import { Address, BigDecimal, BigInt, ByteArray, Bytes, crypto, ipfs, json, JSONValueKind, store } from '@graphprotocol/graph-ts';
import { Signal, Proposal } from '../types/schema';
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


export function writesignal(signalId: string, proposalId: string): void {
  let newsignal = readProposal(signalId, proposalId)
  saveSignal(newsignal);
}


export function readProposal(id: string, proposalId: string): Signal {
  let signal = getSignal(id)
  let proposal = store.get('Proposal', proposalId) as Proposal;

  let ipfsData = ipfs.cat('/ipfs/' + proposal.descriptionHash);
  if (ipfsData != null && ipfsData.toString() !== '{}') {

    let descJson = json.fromBytes(ipfsData as Bytes);
    if (descJson.kind !== JSONValueKind.OBJECT) {
      return signal;
    }
    if (descJson.toObject().get('key') != null) {
      signal.data = descJson.toObject().get('key').toString();
    }
  }
  return signal;
}
