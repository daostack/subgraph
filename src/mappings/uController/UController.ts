import 'allocator/arena'
export { allocate_memory }

import { Entity, Value, store, crypto, ByteArray, Bytes, Address,BigInt } from '@graphprotocol/graph-ts'

import { UController, MintTokens, RegisterScheme, UnregisterScheme, UpgradeController, AddGlobalConstraint, RemoveGlobalConstraint } from '../../types/UController/UController'
import { concat } from '../../utils';
import { ReputationContract ,UControllerScheme, UControllerOrganization, UControllerGlobalConstraint, UControllerRegisterScheme, UControllerUnregisterScheme, UControllerUpgradeController, UControllerAddGlobalConstraint, UControllerRemoveGlobalConstraint } from '../../types/schema';
import { Reputation } from '../../types/Reputation/Reputation'

function insertScheme(uControllerAddress: Address, avatarAddress: Address, scheme: Address): void {
    let uController = UController.bind(uControllerAddress);
    let paramsHash = uController.getSchemeParameters(scheme, avatarAddress);
    let perms = uController.getSchemePermissions(scheme, avatarAddress);

    let ent = new UControllerScheme()
    ent.avatarAddress = avatarAddress.toHex();
    ent.address = scheme;
    ent.paramsHash = paramsHash;
    ent.canRegisterSchemes = (perms[3] & 2) == 2;
    ent.canManageGlobalConstraints = (perms[3] & 4) == 4;
    ent.canUpgradeController = (perms[3] & 8) == 8;
    ent.canDelegateCall = (perms[3] & 16) == 16;

    store.set('UControllerScheme', crypto.keccak256(concat(avatarAddress, scheme)).toHex(), ent);
}

function deleteScheme(avatarAddress: Address, scheme: Address): void {
    store.remove('UControllerScheme', crypto.keccak256(concat(avatarAddress, scheme)).toHex());
}

function insertOrganization(uControllerAddress: Address, avatarAddress: Address): void {
    let uController = UController.bind(uControllerAddress)
    let org = uController.organizations(avatarAddress);
    let ent = new UControllerOrganization();
    ent.avatarAddress = avatarAddress.toHex();
    let reputationContract = new ReputationContract();
    let rep = Reputation.bind(org.value1);
    reputationContract.address = org.value1;
    reputationContract.totalSupply = rep.totalSupply();
    store.set('ReputationContract', org.value1.toHex(), reputationContract);
    ent.nativeToken = org.value0;
    ent.nativeReputation = org.value1.toHex();
    ent.controller = uControllerAddress;

    store.set('UControllerOrganization', avatarAddress.toHex(), ent);
}

function updateController(avatarAddress: Address, newController: Address): void {
    let ent = store.get('UControllerOrganization', avatarAddress.toHex()) as UControllerOrganization;
    if (ent != null) {
        ent.controller = newController;
        store.set('UControllerOrganization', avatarAddress.toHex(), ent);
    }
}

function insertGlobalConstraint(uControllerAddress: Address, avatarAddress: Address, globalConstraint: Address, type: string): void {
    let uController = UController.bind(uControllerAddress);
    let paramsHash = uController.getGlobalConstraintParameters(globalConstraint, avatarAddress);

    let ent = new UControllerGlobalConstraint()
    ent.avatarAddress = avatarAddress.toHex();
    ent.address = globalConstraint;
    ent.paramsHash = paramsHash;
    ent.type = type;

    store.set('UControllerGlobalConstraint', crypto.keccak256(concat(avatarAddress, globalConstraint)).toHex(), ent);
}

function deleteGlobalConstraint(avatarAddress: Address, globalConstraint: Address): void {
    store.remove('UControllerGlobalConstraint', crypto.keccak256(concat(avatarAddress, globalConstraint)).toHex());
}

export function handleRegisterScheme(event: RegisterScheme): void {
    // Detect a new organization event by looking for the first register scheme event for that org.
    let isFirstRegister = store.get('FirstRegisterScheme', event.params._avatar.toHex());
    if (isFirstRegister == null) {
        insertOrganization(event.address, event.params._avatar);
        store.set('FirstRegisterScheme', event.params._avatar.toHex(), new Entity())
    }

    insertScheme(event.address, event.params._avatar, event.params._scheme)

    let ent = new UControllerRegisterScheme();
    ent.txHash = event.transaction.hash.toHex();
    ent.controller = event.address;
    ent.contract = event.params._sender;
    ent.avatarAddress = event.params._avatar;
    ent.scheme = event.params._scheme;
    store.set('UControllerRegisterScheme', event.transaction.hash.toHex(), ent);
}

export function handleUnregisterScheme(event: UnregisterScheme): void {
    deleteScheme(event.params._avatar, event.params._scheme);

    let ent = new UControllerUnregisterScheme()
    ent.txHash = event.transaction.hash.toHex();
    ent.controller = event.address
    ent.contract = event.params._sender;
    ent.avatarAddress = event.params._avatar;
    ent.scheme = event.params._scheme;
    store.set('UControllerUnregisterScheme', event.transaction.hash.toHex(), ent);
}

export function handleUpgradeController(event: UpgradeController): void {
    updateController(event.params._avatar, event.params._newController);

    let ent = new UControllerUpgradeController()
    ent.txHash = event.transaction.hash.toHex();
    ent.controller = event.params._oldController;
    ent.avatarAddress = event.params._avatar;
    ent.newController = event.params._newController;
    store.set('UControllerUpgradeController', event.transaction.hash.toHex(), ent);
}

export function handleAddGlobalConstraint(event: AddGlobalConstraint): void {
  //  let when = event.params._when;
    let type: string;
    type = 'Both';//??????
    // if (when == 0) {
    //     type = 'Pre';
    // } else if (when == 1) {
    //     type = 'Post';
    // } else {
    //     type = 'Both';
    // }
    insertGlobalConstraint(event.address, event.params._avatar, event.params._globalConstraint, type);

    let ent = new UControllerAddGlobalConstraint()
    ent.txHash = event.transaction.hash.toHex();
    ent.controller = event.address;
    ent.avatarAddress = event.params._avatar;
    ent.globalConstraint = event.params._globalConstraint;
    ent.paramsHash = event.params._params;
    ent.type = type;

    store.set('UControllerAddGlobalConstraint', event.transaction.hash.toHex(), ent);
}

export function handleRemoveGlobalConstraint(event: RemoveGlobalConstraint): void {
    deleteGlobalConstraint(event.params._avatar, event.params._globalConstraint);

    let ent = new UControllerRemoveGlobalConstraint()
    ent.txHash = event.transaction.hash.toHex();
    ent.controller = event.address;
    ent.avatarAddress = event.params._avatar;
    ent.globalConstraint = event.params._globalConstraint;
    ent.isPre = event.params._isPre;
    store.set('UControllerRemoveGlobalConstraint', event.transaction.hash.toHex(), ent);
}
