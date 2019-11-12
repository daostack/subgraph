import { Address, ipfs, store } from '@graphprotocol/graph-ts';
import {
  BlacklistDAO,
  DAOTracker,
  ResetDAO,
  TrackDAO,
} from '../../types/DAOTracker/DAOTracker';
import {
  AvatarContract,
  BlacklistedDAO,
  ContractInfo,
  DAOTrackerContract,
  ResetDAO as ResetDAOEntity,
  UControllerOrganization,
} from '../../types/schema';
import { createTemplate, equalStrings, fetchTemplateName } from '../../utils';

export function getDAOTrackerContract(address: Address): DAOTrackerContract {
  let daoTracker = DAOTrackerContract.load(address.toHex()) as DAOTrackerContract;
  if (daoTracker == null) {
    daoTracker = new DAOTrackerContract(address.toHex());
    daoTracker.address = address;
    let daoTrackerSC = DAOTracker.bind(address);
    daoTracker.owner = daoTrackerSC.owner();
    daoTracker.save();
  }
  return daoTracker;
}

export function handleTrackDAO(event: TrackDAO): void {
  // Ensure the DAOTrackerContract has been added to the store
  getDAOTrackerContract(event.address);

  let avatar = event.params._avatar;
  let controller = event.params._controller;
  let reputation = event.params._reputation;
  let daoToken = event.params._daoToken;
  let sender = event.params._sender;
  let arcVersion = event.params._arcVersion;

  // If the avatar already exists, early out
  if (AvatarContract.load(avatar.toHex()) != null) {
    return;
  }

  // If the sender of the 'track' call is the DaoCreator contract, use its arcVersion
  let daoCreatorInfo = ContractInfo.load(sender.toHex());
  if (daoCreatorInfo != null && equalStrings(daoCreatorInfo.name, 'DaoCreator')) {
    arcVersion = daoCreatorInfo.version;
  } else {
    // We've chosen to disable tracking new DAOs that don't come from the DaoCreator,
    // as it's a potential security vulnerability
    return;
  }

  let avatarTemplate = fetchTemplateName('Avatar', arcVersion);
  let controllerTemplate = fetchTemplateName('Controller', arcVersion);
  let reputationTemplate = fetchTemplateName('Reputation', arcVersion);
  let daoTokenTemplate = fetchTemplateName('DAOToken', arcVersion);

  let missingTemplate = avatarTemplate == null ||
                        reputationTemplate == null ||
                        daoTokenTemplate == null;

  let universalController = UControllerOrganization.load(controller.toHex()) != null;

  if (universalController) {
    missingTemplate = missingTemplate || controllerTemplate == null;
  }

  if (missingTemplate) {
    // We're missing a template version in the subgraph
    return;
  }

  // Tell the subgraph to start indexing events from the:
  // Avatar, Controller, DAOToken, and Reputation contracts
  createTemplate(avatarTemplate, avatar);
  createTemplate(reputationTemplate, reputation);
  createTemplate(daoTokenTemplate, daoToken);

  // Track the Controller if it isn't a UController we're already tracking
  if (universalController === false) {
    createTemplate(controllerTemplate, controller);
  }

  // Note, no additional work is needed here because...
  // * ControllerOrganization is added to the store by the 'RegisterScheme' event
  // * AvatarContract, ReputationContract, and TokenContract are added to the store
  //   by the 'RegisterScheme' or 'OwnershipTransfered' events
}

export function handleBlacklistDAO(event: BlacklistDAO): void {
  // Ensure the DAOTrackerContract has been added to the store
  let daoTracker = getDAOTrackerContract(event.address);

  let avatar = event.params._avatar;
  let explanationHash = event.params._explanationHash;

  // Add the BlacklistedDAO to the store
  let blacklistedDAO = new BlacklistedDAO(avatar.toHex());
  blacklistedDAO.address = avatar;
  blacklistedDAO.tracker = daoTracker.id;
  blacklistedDAO.explanationHash = explanationHash;

  if (!equalStrings(explanationHash, '')) {
    let explanation = ipfs.cat('/ipfs/' + explanationHash);

    if (explanation != null) {
      blacklistedDAO.explanation = explanation.toString();
    }
  }

  blacklistedDAO.save();

  // If the DAO has been previously reset, remove that entity from the store
  if (ResetDAOEntity.load(avatar.toHex())) {
    store.remove('ResetDAO', avatar.toHex());
  }
}

export function handleResetDAO(event: ResetDAO): void {
  // Ensure the DAOTrackerContract has been added to the store
  getDAOTrackerContract(event.address);

  let avatar = event.params._avatar;
  let explanationHash = event.params._explanationHash;

  // Remove the BlacklistedDAO from the store
  if (BlacklistedDAO.load(avatar.toHex())) {
    store.remove('BlacklistedDAO', avatar.toHex());
  }

  // Add the ResetDAO entity to the store
  let resetDAO = new ResetDAOEntity(avatar.toHex());
  resetDAO.address = avatar;
  resetDAO.explanationHash = explanationHash;

  if (!equalStrings(explanationHash, '')) {
    let explanation = ipfs.cat('/ipfs/' + explanationHash);

    if (explanation != null) {
      resetDAO.explanation = explanation.toString();
    }
  }

  resetDAO.save();
}
