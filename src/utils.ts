import { Address, U256, Bytes, Entity, ByteArray, crypto, store } from '@graphprotocol/graph-ts'

export function concat(a: ByteArray, b: ByteArray): ByteArray {
  let out = new Uint8Array(a.length + b.length)
  for (let i = 0; i < a.length; i++) {
    out[i] = a[i]
  }
  for (let j = 0; j < b.length; j++) {
    out[a.length + j] = b[j]
  }
  return out as ByteArray
}

export function isZero(num: U256): boolean {
  return num[0] == 0 && num[1] == 0 && num[2] == 0 && num[3] == 0;
}