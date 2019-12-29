import { Address, BigInt } from '@graphprotocol/graph-ts';
import {
  setContractsInfo,
  setTemplatesInfo,
} from '../../contractsInfo';

import { DAOFactory, NewOrg, ProxyCreated, SchemeInstance } from '../../types/DAOFactory/DAOFactory';
import {
  AvatarContract, ContractInfo, DAOFactoryContract,
} from '../../types/schema';
import { createTemplate, fetchTemplateName, setContractInfo } from '../../utils';

function getDAOFactoryContract(address: Address): DAOFactoryContract {
  let daoFactory = DAOFactoryContract.load(address.toHex()) as DAOFactoryContract;
  if (daoFactory == null) {
    daoFactory = new DAOFactoryContract(address.toHex());
    daoFactory.address = address;
    let daoFactoryContract = DAOFactory.bind(address);
    daoFactory.packageName = daoFactoryContract.PACKAGE_NAME();
    daoFactory.app = daoFactoryContract.app();
    daoFactory.save();
    setContractsInfo();
    setTemplatesInfo();
  }
  return daoFactory;
}

export function handleProxyCreated(event: ProxyCreated): void {
  // Ensure the FactoryContract has been added to the store
  getDAOFactoryContract(event.address);
  
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
