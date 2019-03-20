import {
  Address,
  BigInt,
  ByteArray,
  Bytes,
  crypto,
  EthereumEvent,
  store,
  Value,
} from '@graphprotocol/graph-ts';
import { Debug } from './types/schema';

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

export function equals(a: BigInt, b: BigInt): boolean {
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

export function isAddressIndexed(a: Address): boolean {
  // Note: This list should be manually edited
  let addresses = [
    Address.fromString('0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab'),
    Address.fromString('0x79183957Be84C0F4dA451E534d5bA5BA3FB9c696'),
    Address.fromString('0xa255f99FC6de5cBe98dAd2673c11809C707F31f8'),
    Address.fromString('0x0d370B0974454D7b0E0E3b4512c0735A6489A71A'),
    Address.fromString('0xf19A2A01B70519f67ADb309a994Ec8c69A967E8b'),
    Address.fromString('0xdAA71FBBA28C946258DD3d5FcC9001401f72270F'),
    Address.fromString('0x47d818D758b266372C0a2e3715eAA2cBb4863c3e'),
    Address.fromString('0xC89Ce4735882C9F0f0FE26686c53074E09B0D550'),
    Address.fromString('0x59d3631c86BbE35EF041872d502F218A39FBa150'),
    Address.fromString('0x0E696947A06550DEf604e82C26fd9E493e576337'),
    Address.fromString('0xD833215cBcc3f914bD1C9ece3EE7BF8B14f841bb'),
    Address.fromString('0xcB4e66eCA663FDB61818d52A152601cA6aFEf74F'),
    Address.fromString('0x254dffcd3277C0b1660F6d42EFbB754edaBAbC2B'),
  ];
  addresses.forEach((address) => {
    if (equalsBytes(address, a)) {
      return true;
    }
  });
  return false;
}
