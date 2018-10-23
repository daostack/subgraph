import 'allocator/arena'
export { allocate_memory }

import { Entity, Value, store, crypto, ByteArray } from '@graphprotocol/graph-ts'

import { NewOrg } from '../types/DaoCreator/DaoCreator'

export function handleNewOrg(event: NewOrg): void {
    let dao = new Entity()
    dao.setAddress('avatarAddress', event.params._avatar)
    store.set('DAO', event.params._avatar.toHex(), dao as Entity)
}
