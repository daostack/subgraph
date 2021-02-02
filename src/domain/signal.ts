import { Bytes, ipfs, json, JSONValueKind, store } from '@graphprotocol/graph-ts';
import { Signal } from '../types/schema';
import { debug } from '../utils';

function getSignal(id: string): Signal {
  let sig = store.get('Signal', id) as Signal;
  if (!sig) {
    sig = new Signal(id);
  }
  return sig;
}

export function writeSignal(signalId: string, proposalIpfsId: string): void {
  readProposal(signalId, proposalIpfsId);
}

function generateString(key: string, value: string, signal: Signal): void {
  let curlybraceopen = '{';
  let curlybraceclose = '}';
  let colon = ':';
  let comma = ',';
  let quotation = '"';
  let newkeypair = quotation.concat(key).concat(quotation).concat(colon)
                   .concat(quotation).concat(value).concat(quotation);
  debug(newkeypair);
  if (signal.data == null) {
    debug('Going-in-Generate');
    generateNewDict(newkeypair, signal, curlybraceopen, curlybraceclose);
  } else {
    debug('In-Else');
    debug(key);
    let searchstringposition = signal.data.indexOf(key);
    debug(searchstringposition.toString());
    if (searchstringposition === -1) {
      appendDict(newkeypair, signal, curlybraceclose, comma);
    } else if (key !== '') {
      replaceInDict(newkeypair, key, signal, curlybraceopen, curlybraceclose, comma);
    }
  }
}

function replaceInDict(newkeypair: string, key: string, signal: Signal,
                       curlybraceopen: string, curlybraceclosed: string,
                       comma: string): void {
  debug('In-Replace');
  let length = signal.data.length;
  let cutstring = signal.data.slice(1, length - 1);
  let stringarray = cutstring.split(comma);
  let finalstring = '';
  for (let y = 0; y < stringarray.length; ++y) {
    if (stringarray[y].indexOf(key) === -1) {
      finalstring = finalstring.concat(comma).concat(stringarray[y]);
    } else {
      finalstring = finalstring.concat(comma).concat(newkeypair);
    }
  }
  signal.data = curlybraceopen.concat(finalstring.slice(1)).concat(curlybraceclosed);
  debug(signal.data);
  debug('replace');
  signal.save();
}

function generateNewDict(keypair: string, signal: Signal, curlybraceopen: string, curlybraceclosed: string): void {
  let data = curlybraceopen.concat(keypair).concat(curlybraceclosed);
  debug('generate ');
  signal.data = data;
  signal.save();
}

function appendDict(keypair: string, signal: Signal, curlybraceclosed: string, comma: string): void {
  debug('In-Append');
  let signalsubstring = signal.data.substring(0, signal.data.length - 1);
  signal.data = signalsubstring.concat(comma).concat(keypair).concat(curlybraceclosed);
  debug(signal.data);
  signal.save();
}

function readProposal(id: string, proposalIpfsId: string): void {
  let signal = getSignal(id);
  let key = '';
  let value = '';
  let ipfsData = ipfs.cat('/ipfs/' + proposalIpfsId);
  debug('Proposal ID ' + proposalIpfsId);
  if (ipfsData != null && ipfsData.toString() !== '{}') {

    let descJson = json.fromBytes(ipfsData as Bytes);
    if (descJson.kind !== JSONValueKind.OBJECT) {
      debug('No JSON');
    }
    if (descJson.toObject().get('key') != null) {
      key = descJson.toObject().get('key').toString();
      debug(key);
    }
    if (descJson.toObject().get('value') != null) {
      value = descJson.toObject().get('value').toString();
      debug(value);
    }

  }
  generateString(key, value, signal);
}
