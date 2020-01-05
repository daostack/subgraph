import { Address, BigDecimal, BigInt, ByteArray, Bytes, crypto, ipfs, json, JSONValueKind, store } from '@graphprotocol/graph-ts';
import { Signal, Proposal } from '../types/schema';
import { debug } from '../utils';

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
  readProposal(signalId, proposalId)
}

export function generatestring(key: string, value: string, signal: Signal ): void {
  const newkeypair = '"' + key + '"' +':' + '"'+ value + '"';
  signal.data = '{"text":"website.jpg","Header":"website.jpg","info":"hello friends"}'
  let searchstringposition = signal.data.indexOf(key)
  if (signal.data == null){
    generatenewdict(newkeypair,signal)
  }
  else if(searchstringposition === -1){
    appenddict(newkeypair,signal)
  }
  else{
    replaceindict(newkeypair,key,signal)
  }
}

function replaceindict(newkeypair: string, key: string, signal: Signal):void{
  let lenght = signal.data.length;
  let cutstring = signal.data.slice(1,lenght-1);
  let stringarray = cutstring.split(',')
  let finalstring = ""
  for (let y = 0; y < stringarray.length; ++y) {
    if (stringarray[y].indexOf(key) === -1){
      finalstring = finalstring + "," + stringarray[y];
    }else{
      finalstring = finalstring + "," + newkeypair;
      }
    }
    signal.data = "{"+finalstring.slice(1)+"}"
    debug(signal.data);
    saveSignal(signal);
  }

function generatenewdict(keypair: string, signal: Signal): void{
  const data = '{' + keypair + '}';
  debug("generate");
  signal.data = data;
  debug(signal.data);
  saveSignal(signal);
}

function appenddict(keypair: string, signal: Signal):void{
  let signalsubstring = signal.data.substring(0,signal.data.length-1)
  signal.data = signalsubstring + "," + keypair + "}"
  debug(signal.data);
  saveSignal(signal);
}

export function readProposal(id: string, proposalId: string): void {
  let signal = getSignal(id);
  var key = '';
  var value = '';
  let proposal = store.get('Proposal', proposalId) as Proposal;

  let ipfsData = ipfs.cat('/ipfs/' + proposal.descriptionHash);
  if (ipfsData != null && ipfsData.toString() !== '{}') {

    let descJson = json.fromBytes(ipfsData as Bytes);
    if (descJson.kind !== JSONValueKind.OBJECT) {
      debug("");
    }
    if (descJson.toObject().get('key') != null) {
      key = descJson.toObject().get('key').toString();
    }
    if (descJson.toObject().get('value') != null) {
      value = descJson.toObject().get('value').toString();
    }

  }
  generatestring(key,value,signal)

}
