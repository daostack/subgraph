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
  DAOTrackerContract,
  ResetDAO as ResetDAOEntity,
} from '../../types/schema';
import {
  Avatar_0_0_1_rc_31,
  Controller_0_0_1_rc_31,
  DAOToken_0_0_1_rc_31,
  Reputation_0_0_1_rc_31,
} from '../../types/templates';
import { equalStrings } from '../../utils';

export function getDAOTrackerContract(address: Address): DAOTrackerContract {
  let daoTracker = DAOTrackerContract.load(address.toHex()) as DAOTrackerContract;
  if (daoTracker == null) {
    daoTracker = new DAOTrackerContract(address.toHex());
    daoTracker.address = address;
    let daoTrackerSC = DAOTracker.bind(address);
    daoTracker.owner = daoTrackerSC.owner();
    store.set('DAOTrackerContract', daoTracker.id, daoTracker);
  }
  return daoTracker;
}

export function handleTrackDAO(event: TrackDAO): void {
  // Ensure the DAOTrackerContract has been added to the store
  getDAOTrackerContract(event.address);

  let _avatar = event.params._avatar;
  let _controller = event.params._controller;
  let _reputation = event.params._reputation;
  let _daoToken = event.params._daoToken;

  // If the avatar already exists, early out
  if (AvatarContract.load(_avatar.toHex()) != null) {
    return;
  }

  // Tell the subgraph to start indexing events from the:
  // Avatar, Controller, DAOToken, and Reputation contracts
  Avatar_0_0_1_rc_31.create(_avatar);
  Reputation_0_0_1_rc_31.create(_reputation);
  DAOToken_0_0_1_rc_31.create(_daoToken);

  // Track the Controller if it isn't a UController we're already tracking
  if (store.get('UControllerOrganization', _controller.toHex()) == null) {
    Controller_0_0_1_rc_31.create(_controller);
  }

  // Note, no additional work is needed here because...
  // * ControllerOrganization is added to the store by the 'RegisterScheme' event
  // * AvatarContract, ReputationContract, and TokenContract are added to the store
  //   by the 'RegisterScheme' or 'OwnershipTransfered' events
}

export function handleBlacklistDAO(event: BlacklistDAO): void {
  // Ensure the DAOTrackerContract has been added to the store
  let daoTracker = getDAOTrackerContract(event.address);

  let _avatar = event.params._avatar;
  let _explanationHash = event.params._explanationHash;

  // Add the BlacklistedDAO to the store
  let blacklistedDAO = new BlacklistedDAO(_avatar.toHex());
  blacklistedDAO.address = _avatar;
  blacklistedDAO.tracker = daoTracker.id;
  blacklistedDAO.explanationHash = _explanationHash;

  if (!equalStrings(_explanationHash, '')) {
    let explanation = ipfs.cat('/ipfs/' + _explanationHash);

    if (explanation != null) {
      blacklistedDAO.explanation = explanation.toString();
    }
  }

  store.set('BlacklistedDAO', blacklistedDAO.id, blacklistedDAO);

  // If the DAO has been previously reset, remove that entity from the store
  if (store.get('ResetDAO', _avatar.toHex())) {
    store.remove('ResetDAO', _avatar.toHex());
  }
}

export function handleResetDAO(event: ResetDAO): void {
  // Ensure the DAOTrackerContract has been added to the store
  getDAOTrackerContract(event.address);

  let _avatar = event.params._avatar;
  let _explanationHash = event.params._explanationHash;

  // Remove the BlacklistedDAO from the store
  if (store.get('BlacklistedDAO', _avatar.toHex())) {
    store.remove('BlacklistedDAO', _avatar.toHex());
  }

  // Add the ResetDAO entity to the store
  let resetDAO = new ResetDAOEntity(_avatar.toHex());
  resetDAO.address = _avatar;
  resetDAO.explanationHash = _explanationHash;

  if (!equalStrings(_explanationHash, '')) {
    let explanation = ipfs.cat('/ipfs/' + _explanationHash);

    if (explanation != null) {
      resetDAO.explanation = explanation.toString();
    }
  }

  store.set('ResetDAO', resetDAO.id, resetDAO);
}
