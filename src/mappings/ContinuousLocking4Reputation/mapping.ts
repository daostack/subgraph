// Import entity types generated from the GraphQL schema
import { crypto } from '@graphprotocol/graph-ts';
import { ContinuousLocking4Reputation, ExtendLocking, LockToken, Redeem, Release } from '../../types/ContinuousLocking4Reputation/ContinuousLocking4Reputation';
import {
  CL4RLock,
  CL4RRedeem,
} from '../../types/schema';
import { concat } from '../../utils';

export function handleRedeem(event: Redeem): void {
  let redeem = new CL4RRedeem(
    event.address.toHex() + event.params._lockingId.toString() + event.params._batchIndex.toString(),
  );
  redeem.lock = event.address.toHex() + event.params._lockingId.toString();
  redeem.amount = event.params._amount;
  redeem.redeemedAt = event.block.timestamp;
  redeem.batchIndex = event.params._batchIndex;
  redeem.save();
}

export function handleRelease(event: Release): void {
  let lock = CL4RLock.load(
    event.address.toHex() + event.params._lockingId.toString(),
  );

  if (lock ==  null) {
    return;
  }

  lock.released = true;
  lock.releasedAt = event.block.timestamp;
  lock.save();
}

export function handleLockToken(event: LockToken): void {
  let lock = new CL4RLock(
    event.address.toHex() + event.params._lockingId.toString(),
  );
  let cl4r = ContinuousLocking4Reputation.bind(event.address);

  let avatar = cl4r.avatar();
  lock.dao = avatar.toHex();
  lock.scheme = crypto.keccak256(concat(avatar, event.address)).toHex();
  lock.lockingId = event.params._lockingId;
  lock.lockingTime = event.block.timestamp;
  lock.locker = event.params._locker;
  lock.amount = event.params._amount;
  lock.period = event.params._period;
  lock.released = false;
  lock.save();
}

export function handleExtendLocking(event: ExtendLocking): void {
  let lock = CL4RLock.load(
    event.address.toHex() + event.params._lockingId.toString(),
  );

  if (lock ==  null) {
    return;
  }

  lock.period = lock.period.plus(event.params._extendPeriod);
  lock.save();
}
