import {
  Address,
  BigInt,
  Bytes,
  ByteArray,
  crypto,
  store
} from "@graphprotocol/graph-ts";
import { Redemption, Reward } from "./types/schema";

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

export function updateRedemption(
  beneficiary: Address,
  avatar: Address,
  amount: BigInt,
  proposalId: Bytes,
  rewardType: ByteArray,
  rewardString: String
): void {
  let accountId = crypto.keccak256(concat(beneficiary, avatar));

  let rewardId = crypto.keccak256(concat(rewardType, amount as ByteArray));

  let uniqueId = crypto
    .keccak256(concat(proposalId, concat(accountId, rewardId)))
    .toHex();

  let redemption = store.get("Redemption", uniqueId) as Redemption;
  if (redemption == null) {
    redemption = new Redemption();
    redemption.redeemer = beneficiary;
    redemption.proposalId = proposalId.toHex();
    redemption.rewardId = rewardId.toHex();
    store.set("Redemption", uniqueId, redemption);
  }

  let reward = store.get("Reward", rewardId.toHex()) as Reward;
  if (reward == null) {
    reward = new Reward();
    reward.id = rewardId.toHex();
    reward.type = rewardString.toString();
    reward.amount = amount;

    store.set("Reward", rewardId.toHex(), reward);
  }
}

export const zero256 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export function isZero(num: BigInt): boolean {
  for (let i = 0; i < num.length; i++) {
    if (num[i] != 0) {
      return false;
    }
  }
  return true;
}

export function addition(a: BigInt, b: BigInt): BigInt {
  let first = a.toI32();
  let second = b.toI32();
  let total = first + second;
  return total as BigInt;
}
