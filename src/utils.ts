import {
  Address,
  BigInt,
  ByteArray,
  Bytes,
  crypto,
  DataSourceTemplate,
  EthereumEvent,
  store,
  Value,
} from '@graphprotocol/graph-ts';
import {
  BlacklistedDAO,
  ContractInfo,
  Debug,
  TemplateInfo,
} from './types/schema';

export function concat(a: ByteArray, b: ByteArray): ByteArray {
  let out = new Uint8Array(a.length + b.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = a[i];
  }
  for (let j = 0; j < b.length; j++) {
    out[a.length + j] = b[j];
  }
  return out as ByteArray;
}

export function eventId(event: EthereumEvent): string {
  return crypto
    .keccak256(
      concat(event.transaction.hash, event.transactionLogIndex as ByteArray),
    )
    .toHex();
}

export function hexToAddress(hex: string): Address {
  return Address.fromString(hex.substr(2));
}

/**
 * WORKAROUND: there's no `console.log` functionality in mapping.
 * so we use `debug(..)` which writes a `Debug` entity to the store so you can see them in graphiql.
 */
let debugId = 0;
export function debug(msg: string): void {

  let id = BigInt.fromI32(debugId).toHex();
  let ent = new Debug(id);
  ent.set('message', Value.fromString(msg));
  store.set('Debug', id, ent);
  debugId++;
}

export function equalsBytes(a: Bytes, b: Bytes): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

export function equalStrings(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i].charCodeAt(0) !== b[i].charCodeAt(0)) {
      return false;
    }
  }
  return true;
}

export function setContractInfo(address: string, name: string, alias: string, version: string): void {
    let contractInfo = ContractInfo.load(address);
    if (contractInfo == null) {
        contractInfo = new ContractInfo(address);
        contractInfo.address = Address.fromString(address);
        contractInfo.name =  name;
        contractInfo.alias =  alias;
        contractInfo.version = version;
        contractInfo.save();
    }
}

export function setTemplateInfo(name: string, version: string, templateName: string): void {
  let id = name.concat(version);
  let templateInfo = TemplateInfo.load(id);
  if (templateInfo == null) {
    templateInfo = new TemplateInfo(id);
    templateInfo.templateName = templateName;
    templateInfo.save();
  }
}

export function fetchTemplateName(name: string, version: string): string | null {
  let id = name.concat(version);
  let templateInfo = TemplateInfo.load(id);
  if (templateInfo == null) {
    return null;
  } else {
    return templateInfo.templateName;
  }
}

export function createTemplate(templateName: string, address: Address): void {
  DataSourceTemplate.create(templateName, [address.toHex()]);
}

export function setBlacklistedDAO(address: string): void {
  let blacklistedDAO = BlacklistedDAO.load(address);
  if (blacklistedDAO == null) {
    blacklistedDAO = new BlacklistedDAO(address);
    blacklistedDAO.save();
  }
}

export function replace(target: String, search: String, replacement: String): String {
  var len: usize = target.length;
  var slen: usize = search.length;
  if (len <= slen) {
    return len < slen ? target : select<String>(replacement, target, search == target);
  }
  var index: isize = target.indexOf(search);
  if (~index) {
    let rlen: usize = replacement.length;
    len -= slen;
    let olen = len + rlen;
    if (olen) {
      let out = memory.allocate(olen << 1);
      memory.copy(out, changetype<usize>(target), index << 1);
      memory.copy(
        out + (index << 1),
        changetype<usize>(replacement),
        rlen << 1
      );
      memory.copy(
        out + ((index + rlen) << 1),
        changetype<usize>(target) + ((index + slen) << 1),
        (len - index) << 1
      );
      return changetype<String>(out);
    }
  }
  return target;
}

export function replaceAll(target: String, search: String, replacement: String): String {
  let result = target;
  while (result.indexOf(search.toString()) != -1) {
    result = replace(result, search, replacement)
  }
  return result
}