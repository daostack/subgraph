import { Address, BigDecimal, BigInt, ByteArray, Bytes, crypto, ipfs, json, JSONValueKind, store } from '@graphprotocol/graph-ts';
import { Signal, Proposal } from '../types/schema';
import { getProposal } from './proposal'
import { concat, debug } from '../utils';

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

export function generatestring(key: string, value: string, signal: Signal ): Signal {
  const newvar = '{'+ '"' + key + '"' +':' + '"'+ value + '"' + '}';
  debug(newvar);
  if (signal.data == null){
    const data = '[' + newvar + ']';
    signal.data = data;
    debug(signal.data);
  }else{
    debug("This means there was data here");
  }
  return signal
}


export function readProposal(id: string, proposalId: string): Signal {
  let signal = getSignal(id);
  var key = '';
  var value = '';
  let proposal = store.get('Proposal', proposalId) as Proposal;

  let ipfsData = ipfs.cat('/ipfs/' + proposal.descriptionHash);
  if (ipfsData != null && ipfsData.toString() !== '{}') {

    let descJson = json.fromBytes(ipfsData as Bytes);
    if (descJson.kind !== JSONValueKind.OBJECT) {
      return signal;
    }
    if (descJson.toObject().get('key') != null) {
      key = descJson.toObject().get('key').toString();
    }
    if (descJson.toObject().get('value') != null) {
      value = descJson.toObject().get('value').toString();
    }

  }
  let signalstring = generatestring(key,value,signal)
  return signalstring;
}
