import 'allocator/arena';

import {
  Address,
  BigInt,
  Bytes,
  crypto,
  log,
  store,
} from '@graphprotocol/graph-ts';

import { DAOToken } from '../../types/Controller/DAOToken';
import { Reputation } from '../../types/Controller/Reputation';
import { SchemeConstraints } from '../../types/Controller/SchemeConstraints';
import { GenesisProtocol } from '../../types/GenesisProtocol/GenesisProtocol';

import * as domain from '../../domain';

import {
  AvatarContract,
  ContinuousLocking4ReputationParams,
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
  FirstRegisterScheme,
  GenericSchemeMultiCallParam,
  GenericSchemeParam,
  GenesisProtocolParam,
  ReputationContract,
  SchemeRegistrarParam,
  TokenContract,
  UGenericSchemeParam,
} from '../../types/schema';

import {
  AddGlobalConstraint,
  Controller,
  RegisterScheme,
  RemoveGlobalConstraint,
  UnregisterScheme,
  UpgradeController,
} from '../../types/Controller/Controller';

import { ContinuousLocking4Reputation } from '../../types/ContinuousLocking4Reputation/ContinuousLocking4Reputation';
import { concat, equalsBytes, equalStrings, eventId } from '../../utils';

function insertScheme(
  controllerAddress: Address,
  avatarAddress: Address,
  scheme: Address,
  paramsHash: Bytes,
): void {
  let controller = Controller.bind(controllerAddress);
  let perms = controller.getSchemePermissions(scheme, avatarAddress);
  let controllerSchemeId = crypto
    .keccak256(concat(avatarAddress, scheme))
    .toHex();
  let controllerScheme = ControllerScheme.load(controllerSchemeId);
  if (controllerScheme == null) {
    controllerScheme = new ControllerScheme(controllerSchemeId);
    controllerScheme.numberOfQueuedProposals = BigInt.fromI32(0);
    controllerScheme.numberOfPreBoostedProposals = BigInt.fromI32(0);
    controllerScheme.numberOfBoostedProposals = BigInt.fromI32(0);
    controllerScheme.numberOfExpiredInQueueProposals = BigInt.fromI32(0);
  }

  controllerScheme.isRegistered = true;
  controllerScheme.dao = avatarAddress.toHex();
  controllerScheme.paramsHash = paramsHash;
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

function insertOrganization(
  controllerAddress: Address,
  avatarAddress: Address,
): void {
  let controller = Controller.bind(controllerAddress);
  let reputation = controller.nativeReputation();

  let reputationContract = new ReputationContract(reputation.toHex());
  let rep = Reputation.bind(reputation);
  reputationContract.address = reputation;
  reputationContract.totalSupply = rep.totalSupply();
  store.set('ReputationContract', reputationContract.id, reputationContract);

  let token = controller.nativeToken();

  let tokenContract = new TokenContract(token.toHex());
  let daotoken = DAOToken.bind(token);
  tokenContract.address = token;
  tokenContract.totalSupply = daotoken.totalSupply();
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

  let ent = new ControllerGlobalConstraint(
    crypto.keccak256(concat(avatarAddress, globalConstraint)).toHex(),
  );
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
  let paramsHash = controller.getSchemeParameters(event.params._scheme, avatar);
  insertScheme(event.address, avatar, event.params._scheme, paramsHash);

  domain.handleRegisterScheme(
    avatar,
    token,
    reputation,
    event.params._scheme,
    paramsHash,
    event.block.timestamp,
  );

  // Detect a new organization event by looking for the first register scheme event for that org.
  let isFirstRegister = FirstRegisterScheme.load(avatar.toHex());
  if (isFirstRegister == null) {
    insertOrganization(event.address, avatar);
    isFirstRegister = new FirstRegisterScheme(avatar.toHex());
    isFirstRegister.save();
  }

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

export function setGPParams(gpAddress: Address, gpParamsHash: Bytes, avatar: Address): void {
  let gp = GenesisProtocol.bind(gpAddress);
  let gpParams = GenesisProtocolParam.load(gpParamsHash.toHex());
  if (!equalsBytes(gpParamsHash, new Bytes(32))) {
    if (gpParams == null) {
        gpParams = new GenesisProtocolParam(gpParamsHash.toHex());
    }
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

export function setContributionRewardParams(
  avatar: Address,
  scheme: Address,
  vmAddress: Address,
  vmParamsHash: Bytes,
): void {
  setGPParams(vmAddress, vmParamsHash, avatar);
  let controllerScheme = ControllerScheme.load(
    crypto.keccak256(concat(avatar, scheme)).toHex(),
  );
  if (controllerScheme != null) {
    let contributionRewardParams = new ContributionRewardParam(
      controllerScheme.paramsHash.toHex(),
    );
    contributionRewardParams.votingMachine = vmAddress;
    contributionRewardParams.voteParams = vmParamsHash.toHex();
    contributionRewardParams.save();
    controllerScheme.contributionRewardParams = contributionRewardParams.id;
    controllerScheme.save();
  }
}

export function setContinuousLocking4ReputationParams(
  avatar: Address,
  scheme: Address,
  startTime: BigInt,
  redeemEnableTime: BigInt,
  batchTime: BigInt,
  token: Address,
): void {
  let controllerScheme = ControllerScheme.load(
    crypto.keccak256(concat(avatar, scheme)).toHex(),
  );
  let continuousLocking4ReputationParams = new ContinuousLocking4ReputationParams(
    scheme.toHex(),
  );
  let tokenContract = DAOToken.bind(token);
  continuousLocking4ReputationParams.startTime = startTime;
  continuousLocking4ReputationParams.redeemEnableTime = redeemEnableTime;
  continuousLocking4ReputationParams.batchTime = batchTime;
  continuousLocking4ReputationParams.token = token;
  let tokenCallResult = tokenContract.try_name();
  if (tokenCallResult.reverted) {
    log.info('CL4R token try_name reverted', []);
  } else {
    continuousLocking4ReputationParams.tokenName = tokenCallResult.value;
  }

  tokenCallResult = tokenContract.try_symbol();
  if (tokenCallResult.reverted) {
    log.info('CL4R token try_symbol reverted', []);
  } else {
    continuousLocking4ReputationParams.tokenSymbol = tokenCallResult.value;
  }

  let cl4rContract = ContinuousLocking4Reputation.bind(scheme);

  let cl4rCallResult = cl4rContract.try_maxLockingBatches();
  if (cl4rCallResult.reverted) {
    log.info('CL4R try_maxLockingBatches reverted', []);
  } else {
    continuousLocking4ReputationParams.maxLockingBatches = cl4rCallResult.value;
  }

  cl4rCallResult = cl4rContract.try_repRewardConstA();
  if (cl4rCallResult.reverted) {
    log.info('CL4R try_repRewardConstA reverted', []);
  } else {
    continuousLocking4ReputationParams.repRewardConstA = cl4rCallResult.value;
  }

  cl4rCallResult = cl4rContract.try_repRewardConstB();
  if (cl4rCallResult.reverted) {
    log.info('CL4R try_repRewardConstB reverted', []);
  } else {
    continuousLocking4ReputationParams.repRewardConstB = cl4rCallResult.value;
  }

  cl4rCallResult = cl4rContract.try_batchesIndexCap();
  if (cl4rCallResult.reverted) {
    log.info('CL4R batchesIndexCap reverted', []);
  } else {
    continuousLocking4ReputationParams.batchesIndexCap = cl4rCallResult.value;
  }

  let agreementHashCallResult = cl4rContract.try_getAgreementHash();
  if (agreementHashCallResult.reverted) {
    log.info('CL4R getAgreementHash reverted', []);
  } else {
    continuousLocking4ReputationParams.agreementHash = agreementHashCallResult.value.toString();
  }

  continuousLocking4ReputationParams.save();
  if (controllerScheme != null) {
    controllerScheme.continuousLocking4ReputationParams = continuousLocking4ReputationParams.id;
    controllerScheme.save();
  }
}

export function setContributionRewardExtParams(
  avatar: Address,
  scheme: Address,
  vmAddress: Address,
  vmParamsHash: Bytes,
  rewarder: Address,
): void {
  setGPParams(vmAddress, vmParamsHash, avatar);
  let controllerScheme = ControllerScheme.load(
    crypto.keccak256(concat(avatar, scheme)).toHex(),
  );
  let contributionRewardExtParams = new ContributionRewardExtParam(
    scheme.toHex(),
  );
  contributionRewardExtParams.votingMachine = vmAddress;
  contributionRewardExtParams.voteParams = vmParamsHash.toHex();
  contributionRewardExtParams.rewarder = rewarder;
  contributionRewardExtParams.save();
  if (controllerScheme != null) {
    controllerScheme.contributionRewardExtParams = contributionRewardExtParams.id;
    controllerScheme.save();
  }
}

export function setSchemeRegistrarParams(
  avatar: Address,
  scheme: Address,
  vmAddress: Address,
  voteRegisterParams: Bytes,
  voteRemoveParams: Bytes,
): void {
  setGPParams(vmAddress, voteRegisterParams, avatar);
  setGPParams(vmAddress, voteRemoveParams, avatar);
  let controllerScheme = ControllerScheme.load(
    crypto.keccak256(concat(avatar, scheme)).toHex(),
  );
  if (controllerScheme != null) {
    let schemeRegistrarParams = new SchemeRegistrarParam(
      controllerScheme.paramsHash.toHex(),
    );
    schemeRegistrarParams.votingMachine = vmAddress;
    schemeRegistrarParams.voteRegisterParams = voteRegisterParams.toHex();
    schemeRegistrarParams.voteRemoveParams = voteRemoveParams.toHex();
    schemeRegistrarParams.save();
    controllerScheme.schemeRegistrarParams = schemeRegistrarParams.id;
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

export function setGenericSchemeMultiCallParams(
  avatar: Address,
  scheme: Address,
  vmAddress: Address,
  vmParamsHash: Bytes,
  schemeConstraints: Address,
): void {
  setGPParams(vmAddress, vmParamsHash, avatar);
  let controllerScheme = ControllerScheme.load(
    crypto.keccak256(concat(avatar, scheme)).toHex(),
  );
  let genericSchemeMultiCallParams = new GenericSchemeMultiCallParam(scheme.toHex());
  genericSchemeMultiCallParams.votingMachine = vmAddress;
  genericSchemeMultiCallParams.voteParams = vmParamsHash.toHex();
  genericSchemeMultiCallParams.schemeConstraints = schemeConstraints;
  let addressZero = '0x0000000000000000000000000000000000000000';
  if (!equalStrings(schemeConstraints.toHex(), addressZero)) {
    let schemeConstraintsContract = SchemeConstraints.bind(schemeConstraints);
    genericSchemeMultiCallParams.contractsWhiteList = schemeConstraintsContract.getContractsWhiteList() as Bytes[];
  }
  genericSchemeMultiCallParams.save();
  if (controllerScheme != null) {
    controllerScheme.genericSchemeMultiCallParams = genericSchemeMultiCallParams.id;
    controllerScheme.save();
  }
}

export function setUGenericSchemeParams(
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
  if (controllerScheme != null) {
  let genericSchemeParams = new UGenericSchemeParam(
    controllerScheme.paramsHash.toHex(),
  );
  genericSchemeParams.votingMachine = vmAddress;
  genericSchemeParams.voteParams = vmParamsHash.toHex();
  genericSchemeParams.contractToCall = contractToCall;
  genericSchemeParams.save();
  controllerScheme.uGenericSchemeParams = genericSchemeParams.id;
  controllerScheme.save();
  }
}
