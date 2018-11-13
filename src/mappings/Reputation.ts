import 'allocator/arena'
export { allocate_memory }

import {
    Address,
    store,
} from '@graphprotocol/graph-ts'

import {
    Reputation,
    Mint,
    Burn,
} from '../types/Reputation/Reputation'

import {
    createAccount,
    createDao,
} from '../utils'

import {
    Account,
    DAO,
} from '../types/schema'

// TODO: Don't hardcode avatar address
let avatar = Address.fromString('a3f5411cfc9eee0dd108bf0d07433b6dd99037f1')

export function handleMint(event: Mint): void {
    let accountId = createAccount(event.params._to, avatar)
    let account = new Account()
    account.hasReputation = true
    store.set('Account', accountId.toHex(), account as Account)
    let dao = createDao(avatar);
    dao.reputationAddress = event.address
    let members = dao.members as Array<String>
    members.push(accountId.toHex())
    dao.members = members
    store.set('DAO', avatar.toHex(), dao as DAO)
}

// TODO: remove user from members on Burn event
