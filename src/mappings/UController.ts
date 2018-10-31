import 'allocator/arena'
export { allocate_memory }

import { Entity, Value, store, crypto, ByteArray, Bytes, Address } from '@graphprotocol/graph-ts'

import { UController, MintTokens, RegisterScheme, UnregisterScheme, UpgradeController, AddGlobalConstraint, RemoveGlobalConstraint } from '../types/UController/UController'
import { concat } from '../utils';

function insertScheme(uControllerAddress: Address, avatarAddress: Address, scheme: Address): void {
    let uController = UController.bind(uControllerAddress);
    let paramsHash = uController.getSchemeParameters(scheme, avatarAddress);
    let perms = uController.getSchemePermissions(scheme, avatarAddress);

    let ent = new Entity()
    ent.setAddress('avatarAddress', avatarAddress);
    ent.setAddress('address', scheme);
    ent.setBytes('paramsHash', paramsHash);
    ent.setBoolean('canRegisterSchemes', (perms[3] & 2) == 2);
    ent.setBoolean('canManageGlobalConstraints', (perms[3] & 4) == 4);
    ent.setBoolean('canUpgradeController', (perms[3] & 8) == 8);
    ent.setBoolean('canDelegateCall', (perms[3] & 16) == 16);

    store.set('UControllerScheme', crypto.keccak256(concat(avatarAddress, scheme)).toHex(), ent);
}

function deleteScheme(avatarAddress: Address, scheme: Address): void {
    store.remove('UControllerScheme', crypto.keccak256(concat(avatarAddress, scheme)).toHex());
}

function insertOrganization(uControllerAddress: Address, avatarAddress: Address): void {
    let uController = UController.bind(uControllerAddress)
    let org = uController.organizations(avatarAddress);
    let ent = new Entity();
    ent.setAddress('avatarAddress', avatarAddress);
    ent.setAddress('nativeToken', org.value0);
    ent.setAddress('nativeReputation', org.value1);
    ent.setAddress('controller', uControllerAddress);

    store.set('UControllerOrganization', avatarAddress.toHex(), ent);
}

function updateController(avatarAddress: Address, newController: Address): void {
    let ent = store.get('UControllerOrganization', avatarAddress.toHex());
    if (ent != null) {
        ent.setAddress('controller', newController);
        store.set('UControllerOrganization', avatarAddress.toHex(), ent as Entity);
    }
}

function insertGlobalConstraint(uControllerAddress: Address, avatarAddress: Address, globalConstraint: Address, type: string): void {
    let uController = UController.bind(uControllerAddress);
    let paramsHash = uController.getGlobalConstraintParameters(globalConstraint, avatarAddress);

    let ent = new Entity()
    ent.setAddress('avatarAddress', avatarAddress);
    ent.setAddress('address', globalConstraint);
    ent.setBytes('paramsHash', paramsHash);
    ent.setString('type', type)

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

    let ent = new Entity()
    ent.setString('txHash', event.transaction.hash.toHex());
    ent.setAddress('controller', event.address)
    ent.setAddress('contract', event.params._sender);
    ent.setAddress('avatarAddress', event.params._avatar);
    ent.setAddress('scheme', event.params._scheme);
    store.set('UControllerRegisterScheme', event.transaction.hash.toHex(), ent);
}

export function handleUnregisterScheme(event: UnregisterScheme): void {
    deleteScheme(event.params._avatar, event.params._scheme);

    let ent = new Entity()
    ent.setString('txHash', event.transaction.hash.toHex());
    ent.setAddress('controller', event.address)
    ent.setAddress('contract', event.params._sender);
    ent.setAddress('avatarAddress', event.params._avatar);
    ent.setAddress('scheme', event.params._scheme);
    store.set('UControllerUnregisterScheme', event.transaction.hash.toHex(), ent);
}

export function handleUpgradeController(event: UpgradeController): void {
    updateController(event.params._avatar, event.params._newController);

    let ent = new Entity()
    ent.setString('txHash', event.transaction.hash.toHex());
    ent.setAddress('controller', event.params._oldController)
    ent.setAddress('avatarAddress', event.params._avatar);
    ent.setAddress('newController', event.params._newController);
    store.set('UControllerUpgradeController', event.transaction.hash.toHex(), ent);
}

export function handleAddGlobalConstraint(event: AddGlobalConstraint): void {
    let when = event.params._when;
    let type: string;
    if (when == 0) {
        type = 'Pre';
    } else if (when == 1) {
        type = 'Post';
    } else {
        type = 'Both';
    }
    insertGlobalConstraint(event.address, event.params._avatar, event.params._globalConstraint, type);

    let ent = new Entity()
    ent.setString('txHash', event.transaction.hash.toHex());
    ent.setAddress('controller', event.address)
    ent.setAddress('avatarAddress', event.params._avatar);
    ent.setAddress('globalConstraint', event.params._globalConstraint);
    ent.setBytes('paramsHash', event.params._params);
    ent.setString('type', type)

    store.set('UControllerAddGlobalConstraint', event.transaction.hash.toHex(), ent);
}

export function handleRemoveGlobalConstraint(event: RemoveGlobalConstraint): void {
    deleteGlobalConstraint(event.params._avatar, event.params._globalConstraint);

    let ent = new Entity()
    ent.setString('txHash', event.transaction.hash.toHex());
    ent.setAddress('controller', event.address);
    ent.setAddress('avatarAddress', event.params._avatar);
    ent.setAddress('globalConstraint', event.params._globalConstraint);
    ent.setBoolean('isPre', event.params._isPre);
    store.set('UControllerRemoveGlobalConstraint', event.transaction.hash.toHex(), ent);
}





