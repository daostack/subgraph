import 'allocator/arena'
export { allocate_memory }

import { Entity, Address, Value, store, crypto, ByteArray } from '@graphprotocol/graph-ts'

import { Reputation, Mint, Burn } from '../types/Reputation/Reputation'
import { concat } from '../utils'

let avatar = Address.fromString('a3f5411cfc9eee0dd108bf0d07433b6dd99037f1')

export function handleMint(event: Mint): void {
    let accountId = crypto.keccak256(concat(event.params._to, avatar as ByteArray)).toHex()

    let account = store.get('Account', accountId) as Entity
    if (account == null) {
        account = new Entity()
        account.setAddress('address', event.params._to)
        account.setString('accountId', accountId)
        account.setAddress('daoAvatarAddress', avatar)
        account.setU256('reputation', event.params._amount)
    }
    store.set('Account', accountId, account as Entity)

    let dao = new Entity()
    dao.setAddress('reputationAddress', event.address)
    
    store.set('DAO', avatar.toHex(), dao as Entity)
}

export function handleBurn(event: Burn): void {
}
