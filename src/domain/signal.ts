import { Bytes, ipfs, json, JSONValue, JSONValueKind, store } from '@graphprotocol/graph-ts';
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
  const curlybraceopen = String.fromCharCode(123)
  const curlybraceclose = String.fromCharCode(125)
  const colon = String.fromCharCode(58)
  const comma = String.fromCharCode(44)
  const quotation = String.fromCharCode(34)
  const newkeypair = quotation.concat(key).concat(quotation).concat(colon).concat(quotation).concat(value).concat(quotation)
  if (signal.data == null){
    generatenewdict(newkeypair,signal,curlybraceopen, curlybraceclose)
  }else{
    let searchstringposition = signal.data.indexOf(key)
    if(searchstringposition === -1){
      appenddict(newkeypair,signal,curlybraceclose,comma)
    }
    else{
      replaceindict(newkeypair,key,signal,curlybraceopen,curlybraceclose,comma)
  }
}
}

function replaceindict(newkeypair: string,
                              key: string,
                              signal: Signal,
                              curlybraceopen:string,
                              curlybraceclosed:string,
                              comma:string ):void{
  let lenght = signal.data.length;
  let cutstring = signal.data.slice(1,lenght-1);
  let stringarray = cutstring.split(comma)
  let finalstring = ""
  for (let y = 0; y < stringarray.length; ++y) {
    if (stringarray[y].indexOf(key) === -1){
      finalstring = finalstring.concat(comma).concat(stringarray[y]);
    }else{
      finalstring = finalstring.concat(comma).concat(newkeypair);
      }
    }
    signal.data = curlybraceopen.concat(finalstring.slice(1)).concat(curlybraceclosed)
    debug(signal.data);
    debug("replace");
    saveSignal(signal);
  }

function generatenewdict(keypair: string, signal: Signal, curlybraceopen:string, curlybraceclosed:string): void{
  const data = curlybraceopen.concat(keypair).concat(curlybraceclosed);
  debug("generate");
  signal.data = data;
  saveSignal(signal);
}

function appenddict(keypair: string, signal: Signal, curlybraceclosed:string, comma:string):void{
  let signalsubstring = signal.data.substring(0,signal.data.length-1)
  signal.data = signalsubstring.concat(comma).concat(keypair).concat(curlybraceclosed)
  debug(signal.data);
  saveSignal(signal);
}

function teststring(key: string, value: string): boolean {
  var returnboolean: boolean = true;
  const comma: string = String.fromCharCode(44);
  let searchkey: number = key.indexOf(comma)
  let searchvalue: number = value.indexOf(comma)
  if(searchkey != -1 || searchvalue != -1 ){
    returnboolean = false
  }
  return returnboolean
}

export function readProposal(id: string, proposalId: string): void {
  let signal: Signal = getSignal(id);
  var key: string = null;
  var value: string = null;

  let proposal = store.get('Proposal', proposalId) as Proposal;

  let ipfsData = ipfs.cat('/ipfs/' + proposal.descriptionHash);
  if (ipfsData != null && ipfsData.toString() !== '{}') {

    let descJson = json.fromBytes(ipfsData as Bytes);
    if (descJson.kind !== JSONValueKind.OBJECT) {
      debug("No JSON");
    }
    if (descJson.toObject().get('key') != null) {
      key = descJson.toObject().get('key').toString();
    }
    if (descJson.toObject().get('value') != null) {
      value = descJson.toObject().get('value').toString();
    }
  }

  if (key !== null && value !== null ){
      if (teststring(key,value)){
        generatestring(key,value,signal)
      }
  }
}
