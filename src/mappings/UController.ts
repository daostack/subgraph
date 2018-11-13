import 'allocator/arena'
export { allocate_memory }

import {
    Address,
    BigInt,
    ByteArray,
    Bytes,
    crypto,
    SmartContract,
    store,
} from '@graphprotocol/graph-ts'

import { RegisterScheme } from '../types/UController/UController'
import { createDao } from '../utils'

export function handleRegisterScheme(event: RegisterScheme): void {
  let dao = createDao(event.params._avatar);
  dao.controllerAddress = event.address
  store.set('DAO', event.params._avatar.toHex(), dao)
}
