import { Address, BigInt, Bytes, crypto, ByteArray } from '@graphprotocol/graph-ts';
import { GenesisProtocol } from '../types/GenesisProtocol/GenesisProtocol';
import { ContractInfo, GPQueue } from '../types/schema';
import { equalStrings, concat, debug} from '../utils';
import { setContributionRewardParams,
         setSchemeRegistrarParams,
         setGenericSchemeParams } from '../mappings/Controller/mapping';
import {ContributionReward} from '../types/ContributionReward/ContributionReward';
import {SchemeRegistrar} from '../types/SchemeRegistrar/SchemeRegistrar';
import {GenericScheme} from '../types/GenericScheme/GenericScheme';



export function getGPQueue(id: string): GPQueue {
  let gpQueue = GPQueue.load(id) ;
  if (gpQueue == null) {
    gpQueue = new GPQueue(id);
    gpQueue.votingMachine = null;
    gpQueue.scheme = '';
  }
  return gpQueue as GPQueue;
}

export function updateThreshold(dao: string,
                                gpAddress: Address,
                                threshold: BigInt,
                                organizationId: Bytes,
                                scheme: string ): void {
  let gpQueue = getGPQueue(organizationId.toHex());
  gpQueue.threshold =  threshold;
  gpQueue.votingMachine = gpAddress;
  gpQueue.scheme = scheme;
  gpQueue.dao = dao;
  gpQueue.save();
}


export function create(dao: Address,
                       scheme: Address,
                       paramsHash : Bytes ): void {
   let contractInfo = ContractInfo.load(scheme.toHex());
   if (contractInfo ==  null) {
     return;
   }
   let gpAddress : Address;
   let isGPQue = false;
   let gpParamsHash : Bytes;
   if (equalStrings(contractInfo.name,"ContributionReward")) {
     let contributionReward =  ContributionReward.bind(scheme);
     let parameters = contributionReward.parameters(paramsHash);
     gpAddress = parameters.value1;
     setContributionRewardParams(dao,scheme,gpAddress,parameters.value0);
     isGPQue = true;

   }
   if (equalStrings(contractInfo.name,"SchemeRegistrar")) {
     let schemeRegistrar =  SchemeRegistrar.bind(scheme);
     let parameters = schemeRegistrar.parameters(paramsHash);
     gpAddress = parameters.value2;
     setSchemeRegistrarParams(dao,scheme,gpAddress,parameters.value0,parameters.value1);
     isGPQue = true;
   }
   if (equalStrings(contractInfo.name,"GenericScheme")) {
     let genericScheme =  GenericScheme.bind(scheme);
     let parameters = genericScheme.parameters(paramsHash);
     gpAddress = parameters.value0;
     setGenericSchemeParams(dao,scheme,gpAddress,parameters.value1,parameters.value2);
     isGPQue = true;
   }
   if (isGPQue) {
      let bigOne = new ByteArray(6);
      bigOne[0] = 0;
      bigOne[1] = 0;
      bigOne[2] = 0;
      bigOne[3] = 0;
      bigOne[4] = 0;
      bigOne[5] = 1;
      let organizationId = crypto.keccak256(concat(scheme, dao));
      updateThreshold(dao.toHex(),
                      gpAddress,
                      BigInt.fromUnsignedBytes(bigOne as Bytes),
                      organizationId as Bytes,
                      crypto.keccak256(concat(dao, scheme)).toHex());
   }
}
