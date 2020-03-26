import {
  Address,
  BigInt,
  Bytes,
  crypto,
  log,
  store,
} from '@graphprotocol/graph-ts';

import { GenesisProtocol } from '../../types/GenesisProtocol/GenesisProtocol';

import * as domain from '../../domain';

import {
  AvatarContract,
  ContractInfo,
  ContributionRewardExtParam,
  ContributionRewardParam,
  ControllerAddGlobalConstraint,
  ControllerGlobalConstraint,
  ControllerOrganization,
  ControllerRegisterScheme,
  ControllerRemoveGlobalConstraint,
  ControllerScheme,
  ControllerUnregisterScheme,
  ControllerUpgradeController,
  DAO,
  GenericSchemeParam,
  GenesisProtocolParam,
  JoinAndQuitParam,
  SchemeFactoryParam,
  SchemeRegistrarParam,
  UpgradeSchemeParam,
} from '../../types/schema';

import {
  AddGlobalConstraint,
  Controller,
  RegisterScheme,
  RemoveGlobalConstraint,
  UnregisterScheme,
  UpgradeController,
} from '../../types/Controller/Controller';

import { concat, equalsBytes, eventId } from '../../utils';

function insertScheme(
  controllerAddress: Address,
  avatarAddress: Address,
  scheme: Address,
): void {
  let controller = Controller.bind(controllerAddress);
  let perms = controller.schemesPermissions(scheme);
  let controllerSchemeId = crypto.keccak256(concat(avatarAddress, scheme)).toHex();
  let controllerScheme = ControllerScheme.load(controllerSchemeId);
  if (controllerScheme == null) {
    controllerScheme = new ControllerScheme(controllerSchemeId);
    controllerScheme.numberOfQueuedProposals = BigInt.fromI32(0);
    controllerScheme.numberOfPreBoostedProposals = BigInt.fromI32(0);
    controllerScheme.numberOfBoostedProposals = BigInt.fromI32(0);
    controllerScheme.numberOfExpiredInQueueProposals = BigInt.fromI32(0);
    controllerScheme.isRegistered = true;
  }
  controllerScheme.dao = avatarAddress.toHex();
  /* tslint:disable:no-bitwise */
  controllerScheme.canRegisterSchemes = (perms[3] & 2) == 2;
  /* tslint:disable:no-bitwise */
  controllerScheme.canManageGlobalConstraints = (perms[3] & 4) == 4;
  /* tslint:disable:no-bitwise */
  controllerScheme.canUpgradeController = (perms[3] & 8) == 8;
  /* tslint:disable:no-bitwise */
  controllerScheme.canDelegateCall = (perms[3] & 16) == 16;
  controllerScheme.address = scheme;

  let contractInfo = ContractInfo.load(scheme.toHex());
  if (contractInfo != null) {
    controllerScheme.name = contractInfo.name;
    controllerScheme.version = contractInfo.version;
    controllerScheme.alias = contractInfo.alias;
  }
  controllerScheme.save();
}

function unregisterScheme(avatarAddress: Address, scheme: Address): void {
  let controllerScheme = ControllerScheme.load(crypto.keccak256(concat(avatarAddress, scheme)).toHex());
  if (controllerScheme != null) {
    controllerScheme.isRegistered = false;
    controllerScheme.save();
  }
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
  avatarAddress: Address,
  globalConstraint: Address,
  type: string,
): void {
  let ent = new ControllerGlobalConstraint(crypto.keccak256(concat(avatarAddress, globalConstraint)).toHex());
  ent.address = globalConstraint;
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

  insertScheme(event.address, avatar, event.params._scheme);

  domain.handleRegisterScheme(avatar, event.params._scheme);

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
  unregisterScheme(avatar, event.params._scheme);

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

  if (when == 0) {
    type = 'Pre';
  } else if (when == 1) {
    type = 'Post';
  } else {
    type = 'Both';
  }
  let controller = Controller.bind(event.address);
  let avatar = controller.avatar();
  insertGlobalConstraint(
    avatar,
    event.params._globalConstraint,
    type,
  );

  let ent = new ControllerAddGlobalConstraint(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.controller = event.address;
  ent.globalConstraint = event.params._globalConstraint;
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

export function setGPParams(gpAddress: Address, gpParamsHash: Bytes, avatar: Address): void {
  let gp = GenesisProtocol.bind(gpAddress);
  let gpParams = GenesisProtocolParam.load(gpParamsHash.toHex());
  if (gpParams == null && !equalsBytes(gpParamsHash, new Bytes(32))) {
    gpParams = new GenesisProtocolParam(gpParamsHash.toHex());
    let callResult = gp.try_parameters(gpParamsHash);
    if (callResult.reverted) {
        log.info('genesisProtocol try_parameters reverted', []);
        let dao = DAO.load(avatar.toHex());
        if (dao != null) {
          dao.error = 'genesisProtocol try_parameters reverted';
          dao.save();
        }
    } else {
        let params = callResult.value;
        gpParams.queuedVoteRequiredPercentage = params.value0; // queuedVoteRequiredPercentage
        gpParams.queuedVotePeriodLimit = params.value1; // queuedVotePeriodLimit
        gpParams.boostedVotePeriodLimit = params.value2; // boostedVotePeriodLimit
        gpParams.preBoostedVotePeriodLimit = params.value3; // preBoostedVotePeriodLimit
        gpParams.thresholdConst = params.value4; // thresholdConst
        gpParams.limitExponentValue = params.value5; // limitExponentValue
        gpParams.quietEndingPeriod = params.value6; // quietEndingPeriod
        gpParams.proposingRepReward = params.value7;
        gpParams.votersReputationLossRatio = params.value8; // votersReputationLossRatio
        gpParams.minimumDaoBounty = params.value9; // minimumDaoBounty
        gpParams.daoBountyConst = params.value10; // daoBountyConst
        gpParams.activationTime = params.value11; // activationTime
        gpParams.voteOnBehalf = params.value12 as Bytes; // voteOnBehalf
        gpParams.save();
   }
  }
}

export function setContributionRewardParams(avatar: Address,
                                            scheme: Address,
                                            vmAddress: Address,
                                            vmParamsHash: Bytes): void {
    setGPParams(vmAddress, vmParamsHash, avatar);
    let controllerScheme =  ControllerScheme.load(crypto.keccak256(concat(avatar, scheme)).toHex());
    let contributionRewardParams = new ContributionRewardParam(scheme.toHex());
    contributionRewardParams.votingMachine = vmAddress;
    contributionRewardParams.voteParams = vmParamsHash.toHex();
    contributionRewardParams.save();
    controllerScheme.contributionRewardParams = contributionRewardParams.id;
    controllerScheme.save();
  }

export function setSchemeFactoryParams(avatar: Address,
                                       scheme: Address,
                                       vmAddress: Address,
                                       voteParams: Bytes,
                                       daoFactory: Address): void {
    setGPParams(vmAddress, voteParams, avatar);
    let controllerScheme = ControllerScheme.load(crypto.keccak256(concat(avatar, scheme)).toHex());
    let schemeFactoryParams = new SchemeFactoryParam(scheme.toHex());
    schemeFactoryParams.votingMachine = vmAddress;
    schemeFactoryParams.voteParams = voteParams.toHex();
    schemeFactoryParams.daoFactory = daoFactory;
    schemeFactoryParams.save();
    controllerScheme.schemeFactoryParams = schemeFactoryParams.id;
    controllerScheme.save();
}

export function setSchemeRegistrarParams(avatar: Address,
                                         scheme: Address,
                                         vmAddress: Address,
                                         voteRegisterParams: Bytes,
                                         voteRemoveParams: Bytes): void {
   setGPParams(vmAddress, voteRegisterParams, avatar);
   setGPParams(vmAddress, voteRemoveParams, avatar);
   let controllerScheme =  ControllerScheme.load(crypto.keccak256(concat(avatar, scheme)).toHex());
   let schemeRegistrarParams = new SchemeRegistrarParam(scheme.toHex());
   schemeRegistrarParams.votingMachine = vmAddress;
   schemeRegistrarParams.voteRegisterParams = voteRegisterParams.toHex();
   schemeRegistrarParams.voteRemoveParams = voteRemoveParams.toHex();
   schemeRegistrarParams.save();
   controllerScheme.schemeRegistrarParams = schemeRegistrarParams.id;
   controllerScheme.save();
}

export function setContributionRewardExtParams(
  avatar: Address,
  scheme: Address,
  vmAddress: Address,
  vmParamsHash: Bytes,
  rewarder: Address,
): void {
  setGPParams(vmAddress, vmParamsHash, avatar);
  let controllerScheme = ControllerScheme.load(crypto.keccak256(concat(avatar, scheme)).toHex());
  let contributionRewardExtParams = new ContributionRewardExtParam(scheme.toHex());
  contributionRewardExtParams.votingMachine = vmAddress;
  contributionRewardExtParams.voteParams = vmParamsHash.toHex();
  contributionRewardExtParams.rewarder = rewarder;
  contributionRewardExtParams.save();
  if (controllerScheme != null) {
    controllerScheme.contributionRewardExtParams = contributionRewardExtParams.id;
    controllerScheme.save();
  }
}

export function setGenericSchemeParams(
  avatar: Address,
  scheme: Address,
  vmAddress: Address,
  vmParamsHash: Bytes,
  contractToCall: Bytes,
): void {
  setGPParams(vmAddress, vmParamsHash, avatar);
  let controllerScheme = ControllerScheme.load(
    crypto.keccak256(concat(avatar, scheme)).toHex(),
  );
  let genericSchemeParams = new GenericSchemeParam(scheme.toHex());
  genericSchemeParams.votingMachine = vmAddress;
  genericSchemeParams.voteParams = vmParamsHash.toHex();
  genericSchemeParams.contractToCall = contractToCall;
  genericSchemeParams.save();
  if (controllerScheme != null) {
    controllerScheme.genericSchemeParams = genericSchemeParams.id;
    controllerScheme.save();
  }
}

export function setUpgradeSchemeParams(
  avatar: Address,
  scheme: Address,
  vmAddress: Address,
  vmParamsHash: Bytes,
  arcPackage: Bytes,
): void {
  setGPParams(vmAddress, vmParamsHash, avatar);
  let controllerScheme = ControllerScheme.load(
    crypto.keccak256(concat(avatar, scheme)).toHex(),
  );
  let upgradeSchemeParams = new UpgradeSchemeParam(scheme.toHex());
  upgradeSchemeParams.votingMachine = vmAddress;
  upgradeSchemeParams.voteParams = vmParamsHash.toHex();
  upgradeSchemeParams.arcPackage = arcPackage;
  upgradeSchemeParams.save();
  if (controllerScheme != null) {
    controllerScheme.upgradeSchemeParams = upgradeSchemeParams.id;
    controllerScheme.save();
  }
}

export function setJoinAndQuitParams(
  avatar: Address,
  scheme: Address,
  vmAddress: Address,
  vmParamsHash: Bytes,
  fundingToken: Address,
  minFeeToJoin: BigInt,
  memberReputation: BigInt,
  fundingGoal: BigInt,
  fundingGoalDeadLine: BigInt,
): void {
  setGPParams(vmAddress, vmParamsHash, avatar);
  let controllerScheme = ControllerScheme.load(
    crypto.keccak256(concat(avatar, scheme)).toHex(),
  );
  let joinAndQuitParams = new JoinAndQuitParam(scheme.toHex());
  joinAndQuitParams.votingMachine = vmAddress;
  joinAndQuitParams.voteParams = vmParamsHash.toHex();
  joinAndQuitParams.fundingToken = fundingToken;
  joinAndQuitParams.minFeeToJoin = minFeeToJoin;
  joinAndQuitParams.memberReputation = memberReputation;
  joinAndQuitParams.fundingGoal = fundingGoal;
  joinAndQuitParams.fundingGoalDeadLine = fundingGoalDeadLine;
  joinAndQuitParams.save();
  if (controllerScheme != null) {
    controllerScheme.joinAndQuitParams = joinAndQuitParams.id;
    controllerScheme.save();
  }
}
