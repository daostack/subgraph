import {
    Address,
    BigInt,
    ByteArray,
    Bytes,
    crypto,
    SmartContract,
    store
} from '@graphprotocol/graph-ts'

import {
    Account,
    DAO,
    Redemption
} from './types/schema'

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

export function createDao (avatar: Address): DAO {
    let dao = store.get('DAO', avatar.toHex()) as DAO
    if (dao === null) {
        dao = new DAO()
        dao.avatarAddress = avatar as String
        dao.members = new Array<String>()
        store.set('DAO', avatar.toHex(), dao as DAO)
    }
    return dao;
}

export function createAccount (address: Address, avatar: Address): ByteArray {
    let accountId = crypto.keccak256(concat(address, avatar))
    let account = store.get('Account', accountId.toHex()) as Account
    if (account == null) {
        account = new Account()
        account.accountId = accountId.toHex()
        account.dao = avatar as String
        account.address = address
        account.hasReputation = false
        store.set('Account', accountId.toHex(), account as Account)
    }
    return accountId
}

export function updateRedemption(
    beneficiary: Address,
    avatar: Address,
    absAmount: BigInt,
    signedAmount: BigInt,
    proposalId: Bytes,
    rewardType: ByteArray,
    rewardString: String,
    time: BigInt
): void {
    let accountId = createAccount(beneficiary, avatar)
    let redemptionId = crypto.keccak256(
        concat(proposalId,
        concat(accountId,
        concat(rewardType,
        concat(absAmount as ByteArray, signedAmount as ByteArray))))
    ).toHex()

    let redemption = new Redemption()
    redemption.redemptionId = redemptionId
    redemption.proposal = proposalId.toHex()
    redemption.account = accountId.toHex()
    redemption.type = rewardString
    if (absAmount == null) {
        redemption.amount = signedAmount
    } else {
        redemption.amount = absAmount
    }
    redemption.time = time
    store.set('Redemption', redemptionId, redemption)
}
