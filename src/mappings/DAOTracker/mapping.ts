import { Address, store, ipfs } from '@graphprotocol/graph-ts'
import {
  DAOTracker,
  TrackDAO,
  BlacklistDAO,
  ResetDAO
} from '../../types/DAOTracker/DAOTracker';
import {
  Avatar_0_0_1_rc_31,
  Controller_0_0_1_rc_31,
  DAOToken_0_0_1_rc_31,
  Reputation_0_0_1_rc_31
} from '../../types/templates';
import {
  DAOTrackerContract,
  BlacklistedDAO,
  ResetDAO as ResetDAOEntity
} from '../../types/schema';
import { equalStrings } from '../../utils';

export function getDAOTrackerContract(address: Address): DAOTrackerContract {
  let daoTracker = DAOTrackerContract.load(address.toHex());
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

  const { _avatar, _controller, _reputation, _daoToken } = event.params;

  /* TODO: uncomment when this issue is resolved https://github.com/graphprotocol/graph-node/issues/1333
  // If the avatar hasn't been blacklisted
  const daoTrackerSC = DAOTracker.bind(event.address);
  if (daoTrackerSC.blacklisted(_avatar), 'latest') {
    return;
  }
  */

  // If the avatar already exists, early out
  if (store.get('AvatarContract', _avatar.toHex()) != null) {
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
  const daoTracker = getDAOTrackerContract(event.address);

  const { _avatar, _explanationHash } = event.params;

  // Add the BlacklistedDAO to the store
  const blacklistedDAO = new BlacklistedDAO(_avatar.toHex());
  blacklistedDAO.address = _avatar;
  blacklistedDAO.tracker = daoTracker.id;
  blacklistedDAO.explanationHash = _explanationHash;

  if (!equalStrings(_explanationHash, '')) {
    const explanation = ipfs.cat('/ipfs/' + _explanationHash);

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

  const { _avatar, _explanationHash } = event.params;

  // Remove the BlacklistedDAO from the store
  if (store.get('BlacklistedDAO', _avatar.toHex())) {
    store.remove('BlacklistedDAO', _avatar.toHex());
  }

  // Add the ResetDAO entity to the store
  const resetDAO = new ResetDAOEntity(_avatar.toHex());
  resetDAO.address = _avatar;
  resetDAO.explanationHash = _explanationHash;

  if (!equalStrings(_explanationHash, '')) {
    const explanation = ipfs.cat('/ipfs/' + _explanationHash);

    if (explanation != null) {
      resetDAO.explanation = explanation.toString();
    }
  }

  store.set('ResetDAO', resetDAO.id, resetDAO);
}
