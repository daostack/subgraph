// Import entity types generated from the GraphQL schema
import {
  CL4RLock
} from '../../types/schema';
import { ExtendLocking, LockToken, Redeem, Release } from '../../types/ContinuousLocking4Reputation/ContinuousLocking4Reputation';


export function handleRedeem(event: Redeem): void {
  let lock = CL4RLock.load(
    event.address.toHex() + event.params._lockingId.toString()
  );

  if (lock ==  null) {
    return;
  }

  lock.redeemed = true;
  lock.redeemedAt = event.block.timestamp;
  lock.batchIndexRedeemed = event.params._batchIndex;
  lock.save();
}

export function handleRelease(event: Release): void {
  let lock = CL4RLock.load(
    event.address.toHex() + event.params._lockingId.toString()
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
    event.address.toHex() + event.params._lockingId.toString()
  );

  lock.lockingId = event.params._lockingId;
  lock.locker = event.params._locker;
  lock.amount = event.params._amount;
  lock.period = event.params._period;
  lock.redeemed = false;
  lock.released = false;
  lock.save();
}

export function handleExtendLocking(event: ExtendLocking): void {
  let lock = CL4RLock.load(
    event.address.toHex() + event.params._lockingId.toString()
  );

  if (lock ==  null) {
    return;
  }

  lock.period = lock.period.plus(event.params._extendPeriod);
  lock.save();
}
