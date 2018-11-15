import 'allocator/arena'
export { allocate_memory }

import {
    store,
} from '@graphprotocol/graph-ts'

import {
    DAO,
} from '../types/schema'

import { RegisterScheme } from '../types/UController/UController'
import { createDao } from '../utils'

export function handleRegisterScheme(event: RegisterScheme): void {
  let dao = createDao(event.params._avatar);
  dao.controllerAddress = event.address
  store.set('DAO', event.params._avatar.toHex(), dao as DAO)
}
