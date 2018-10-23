import 'allocator/arena'
export { allocate_memory }

import { Entity, Value, store, crypto, ByteArray } from '@graphprotocol/graph-ts'

import { MintReputation, BurnReputation, MintTokens } from '../types/UController/UController'

export function handleMintReputation(event: MintReputation): void {
    // Tracking reputation minted per account in native rep tracker

    let dao = new Entity()
    dao.setAddress('controllerAddress', event.address)
    store.set('DAO', event.params._avatar.toHex(), dao as Entity)
}

export function handleBurnReputation(event: BurnReputation): void {
    let dao = new Entity()
    store.set('DAO', event.params._avatar.toHex(), dao as Entity)
}
