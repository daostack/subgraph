import { Address, BigInt, store } from '@graphprotocol/graph-ts';
import {
  setContractsInfo,
  setTemplatesInfo,
} from '../../contractsInfo';

import { addDaoMember } from '../../domain';
import { insertNewDAO } from '../../domain/dao';
import { addNewDAOEvent } from '../../domain/event';
import { insertReputation } from '../../domain/reputation';
import { insertToken, updateTokenTotalSupply } from '../../domain/token';
import { DAOToken } from '../../types/Controller/DAOToken';
import { Reputation } from '../../types/Controller/Reputation';
import { DAOFactory, NewOrg, ProxyCreated } from '../../types/DAOFactory/DAOFactory';
import {
  ControllerOrganization, DAOFactoryContract, ReputationContract, ReputationHolder, TokenContract,
} from '../../types/schema';
import { createTemplate, fetchTemplateName, hexToAddress, save, setContractInfo } from '../../utils';

function getDAOFactoryContract(address: Address, timestamp: BigInt): DAOFactoryContract {
  let daoFactory = DAOFactoryContract.load(address.toHex()) as DAOFactoryContract;
  if (daoFactory == null) {
    daoFactory = new DAOFactoryContract(address.toHex());
    daoFactory.address = address;
    let daoFactoryContract = DAOFactory.bind(address);
    daoFactory.packageName = daoFactoryContract.PACKAGE_NAME();
    daoFactory.app = daoFactoryContract.app();
    save(daoFactory, 'DAOFactoryContract', timestamp);
    setContractsInfo();
    setTemplatesInfo();
  }
  return daoFactory;
}

export function handleNewOrg(event: NewOrg): void {
  let reputation = event.params._reputation;
  let reputationContract = new ReputationContract(reputation.toHex());
  reputationContract.reputationHolders = new Array<string>();
  let rep = Reputation.bind(reputation);
  reputationContract.address = reputation;
  reputationContract.totalSupply = rep.totalSupply();
  save(reputationContract, 'ReputationContract', event.block.timestamp);

  let token = event.params._daotoken;
  let tokenContract = new TokenContract(token.toHex());
  tokenContract.tokenHolders = new Array<string>();
  let daotoken = DAOToken.bind(token);
  tokenContract.address = token;
  tokenContract.totalSupply = daotoken.totalSupply();
  tokenContract.owner = event.params._controller;
  save(tokenContract, 'TokenContract', event.block.timestamp);

  let ent = new ControllerOrganization(event.params._avatar.toHex());
  ent.avatarAddress = event.params._avatar;
  ent.nativeToken = token.toHex();
  ent.nativeReputation = reputation.toHex();
  ent.controller = event.params._controller;

  save(ent, 'ControllerOrganization', event.block.timestamp);

  let dao = insertNewDAO(event.params._avatar, token , reputation, event.block.timestamp);
  insertToken(hexToAddress(dao.nativeToken), event.params._avatar.toHex(), event.block.timestamp);
  insertReputation(
    hexToAddress(dao.nativeReputation),
    event.params._avatar.toHex(),
    event.block.timestamp,
  );
  // the following code handle cases where the reputation and token minting are done before the dao creation
  // (e.g using daocreator)
  // get reputation contract
  let repContract = ReputationContract.load(dao.nativeReputation);
  let holders: string[] = repContract.reputationHolders as string[];
  for (let i = 0; i < holders.length; i++) {
    let reputationHolder = store.get('ReputationHolder', holders[i]) as ReputationHolder;
    addDaoMember(reputationHolder, event.block.timestamp);
  }
  updateTokenTotalSupply(hexToAddress(dao.nativeToken), event.block.timestamp);

  addNewDAOEvent(event.params._avatar, dao.name, event.block.timestamp);

}

export function handleProxyCreated(event: ProxyCreated): void {
  // Ensure the FactoryContract has been added to the store
  getDAOFactoryContract(event.address, event.block.timestamp);

  let fullVersion = event.params._version;
  let version = '0.1.1-rc.' + fullVersion[2].toString();
  setContractInfo(
    event.params._proxy.toHex(),
    event.params._contractName,
    event.params._contractName + event.params._proxy.toHex(),
    version.toString(),
  );

  let schemeTemplate = fetchTemplateName(event.params._contractName, version);

  if (schemeTemplate == null) {
    // We're missing a template version in the subgraph
    return;
  }

  // Tell the subgraph to start indexing events from the:
  // Avatar, Controller, DAOToken, and Reputation contracts
  createTemplate(schemeTemplate, event.params._proxy);
}
