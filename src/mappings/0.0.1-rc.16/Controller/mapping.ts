import 'allocator/arena';

import {
  Address,
  BigInt,
  crypto,
  Entity,
  store,
} from '@graphprotocol/graph-ts';

import { Avatar } from '../../../types/Controller/0.0.1-rc.16/Avatar';
import { DAOToken } from '../../../types/Controller/0.0.1-rc.16/DAOToken';
import { Reputation } from '../../../types/Controller/0.0.1-rc.16/Reputation';

import * as domain from '../../../domain';

import {
  AvatarContract,
  ControllerAddGlobalConstraint,
  ControllerGlobalConstraint,
  ControllerOrganization,
  ControllerRegisterScheme,
  ControllerRemoveGlobalConstraint,
  ControllerScheme,
  ControllerUnregisterScheme,
  ControllerUpgradeController,
  ReputationContract,
  TokenContract,
} from '../../../types/schema';

import {
  AddGlobalConstraint,
  Controller,
  RegisterScheme,
  RemoveGlobalConstraint,
  UnregisterScheme,
  UpgradeController,
} from '../../../types/Controller/0.0.1-rc.16/Controller';

import { concat, eventId, getDAOTokenSupply, getRepSupply } from '../../../utils';

function insertScheme(
  controllerAddress: Address,
  avatarAddress: Address,
  scheme: Address,
): void {
  let controller = Controller.bind(controllerAddress);
  let paramsHash = controller.getSchemeParameters(scheme, avatarAddress);
  let perms = controller.getSchemePermissions(scheme, avatarAddress);

  let ent = new ControllerScheme(crypto.keccak256(concat(avatarAddress, scheme)).toHex());
  ent.dao = avatarAddress.toHex();
  ent.address = scheme;
  ent.paramsHash = paramsHash;
  /* tslint:disable:no-bitwise */
  ent.canRegisterSchemes = (perms[3] & 2) === 2;
  /* tslint:disable:no-bitwise */
  ent.canManageGlobalConstraints = (perms[3] & 4) === 4;
  /* tslint:disable:no-bitwise */
  ent.canUpgradeController = (perms[3] & 8) === 8;
  /* tslint:disable:no-bitwise */
  ent.canDelegateCall = (perms[3] & 16) === 16;
  ent.name = '';

  store.set('ControllerScheme', ent.id, ent);
}

function deleteScheme(avatarAddress: Address, scheme: Address): void {
  store.remove(
    'ControllerScheme',
    crypto.keccak256(concat(avatarAddress, scheme)).toHex(),
  );
}

function insertOrganization(
  controllerAddress: Address,
  avatarAddress: Address,
): void {
  let controller = Controller.bind(controllerAddress);
  let reputation = controller.nativeReputation();

  let reputationContract = new ReputationContract(reputation.toHex());
  reputationContract.address = reputation;
  reputationContract.totalSupply = getRepSupply(reputation);
  store.set('ReputationContract', reputationContract.id, reputationContract);

  let token = controller.nativeToken();

  let tokenContract = new TokenContract(token.toHex());
  tokenContract.address = token;
  tokenContract.totalSupply = getDAOTokenSupply(token);
  tokenContract.owner = controllerAddress;
  store.set('TokenContract', tokenContract.id, tokenContract);

  let ent = new ControllerOrganization(avatarAddress.toHex());
  ent.avatarAddress = avatarAddress;
  ent.nativeToken = token.toHex();
  ent.nativeReputation = reputation.toHex();
  ent.controller = controllerAddress;

  store.set('ControllerOrganization', ent.id, ent);
}

function updateController(
  avatarAddress: Address,
  newController: Address,
): void {
  let ent = store.get(
    'ControllerOrganization',
    avatarAddress.toHex(),
  ) as ControllerOrganization;
  if (ent != null) {
    ent.controller = newController;
    store.set('ControllerOrganization', avatarAddress.toHex(), ent);
  }
}

function insertGlobalConstraint(
  controllerAddress: Address,
  avatarAddress: Address,
  globalConstraint: Address,
  type: string,
): void {
  let controller = Controller.bind(controllerAddress);
  let paramsHash = controller.getGlobalConstraintParameters(
    globalConstraint,
    avatarAddress,
  );

  let ent = new ControllerGlobalConstraint(crypto.keccak256(concat(avatarAddress, globalConstraint)).toHex());
  ent.address = globalConstraint;
  ent.paramsHash = paramsHash;
  ent.type = type;

  store.set('ControllerGlobalConstraint', ent.id, ent);
}

function deleteGlobalConstraint(
  avatarAddress: Address,
  globalConstraint: Address,
): void {
  store.remove(
    'ControllerGlobalConstraint',
    crypto.keccak256(concat(avatarAddress, globalConstraint)).toHex(),
  );
}

export function handleRegisterScheme(event: RegisterScheme): void {
  let controller = Controller.bind(event.address);
  let avatar = controller.avatar();

  if (AvatarContract.load(avatar.toHex()) == null) {
      return;
  }
  let token = controller.nativeToken();
  let reputation = controller.nativeReputation();
  domain.handleRegisterScheme(avatar, token, reputation);

  // Detect a new organization event by looking for the first register scheme event for that org.
  let isFirstRegister = store.get(
    'FirstRegisterScheme',
    avatar.toHex(),
  );
  if (isFirstRegister == null) {
    insertOrganization(event.address, avatar);
    store.set(
      'FirstRegisterScheme',
      avatar.toHex(),
      new Entity(),
    );
  }

  insertScheme(event.address, avatar, event.params._scheme);

  let ent = new ControllerRegisterScheme(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.controller = event.address;
  ent.contract = event.params._sender;
  ent.scheme = event.params._scheme;
  store.set('ControllerRegisterScheme', ent.id, ent);
}

export function handleUnregisterScheme(event: UnregisterScheme): void {
  let controller = Controller.bind(event.address);
  let avatar = controller.avatar();
  deleteScheme(avatar, event.params._scheme);

  let ent = new ControllerUnregisterScheme(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.controller = event.address;
  ent.contract = event.params._sender;
  ent.scheme = event.params._scheme;
  store.set('ControllerUnregisterScheme', ent.id, ent);
}

export function handleUpgradeController(event: UpgradeController): void {
  let controller = Controller.bind(event.address);
  let avatar = controller.avatar();
  updateController(avatar, event.params._newController);

  let ent = new ControllerUpgradeController(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.controller = event.params._oldController;
  ent.newController = event.params._newController;
  store.set('ControllerUpgradeController', ent.id, ent);
}

export function handleAddGlobalConstraint(event: AddGlobalConstraint): void {
  let when = event.parameters[2].value.toBigInt().toI32();
  let type: string;

  if (when === 0) {
    type = 'Pre';
  } else if (when === 1) {
    type = 'Post';
  } else {
    type = 'Both';
  }
  let controller = Controller.bind(event.address);
  let avatar = controller.avatar();
  insertGlobalConstraint(
    event.address,
    avatar,
    event.params._globalConstraint,
    type,
  );

  let ent = new ControllerAddGlobalConstraint(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.controller = event.address;
  ent.globalConstraint = event.params._globalConstraint;
  ent.paramsHash = event.params._params;
  ent.type = type;

  store.set('ControllerAddGlobalConstraint', ent.id, ent);
}

export function handleRemoveGlobalConstraint(
  event: RemoveGlobalConstraint,
): void {
  let controller = Controller.bind(event.address);
  let avatar = controller.avatar();
  deleteGlobalConstraint(avatar, event.params._globalConstraint);

  let ent = new ControllerRemoveGlobalConstraint(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.controller = event.address;
  ent.globalConstraint = event.params._globalConstraint;
  ent.isPre = event.params._isPre;
  store.set('ControllerRemoveGlobalConstraint', ent.id, ent);
}
