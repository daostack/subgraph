import { Address, BigInt, ByteArray, Bytes, crypto } from '@graphprotocol/graph-ts';
import { setContributionRewardExtParams,
         setContributionRewardParams,
         setFundingRequestParams,
         setGenericSchemeParams,
         setJoinAndQuitParams,
         setSchemeFactoryParams,
         setSchemeRegistrarParams,
         setUpgradeSchemeParams,
        } from '../mappings/Controller/mapping';
import {ContributionReward} from '../types/ContributionReward/ContributionReward';
import { ContributionRewardExt } from '../types/ContributionRewardExt/ContributionRewardExt';
import { FundingRequest } from '../types/FundingRequest/FundingRequest';
import { GenericScheme } from '../types/GenericScheme/GenericScheme';
import { JoinAndQuit } from '../types/JoinAndQuit/JoinAndQuit';
import { ContractInfo, GPQueue } from '../types/schema';
import {SchemeFactory} from '../types/SchemeFactory/SchemeFactory';
import {SchemeRegistrar} from '../types/SchemeRegistrar/SchemeRegistrar';
import { UpgradeScheme } from '../types/UpgradeScheme/UpgradeScheme';
import { concat, equalStrings} from '../utils';

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
                       scheme: Address): void {
   let contractInfo = ContractInfo.load(scheme.toHex());
   if (contractInfo ==  null) {
     return;
   }
   let gpAddress: Address;
   let isGPQue = false;
   let addressZero = '0x0000000000000000000000000000000000000000';
   if (equalStrings(contractInfo.name, 'ContributionReward')) {
     let contributionReward =  ContributionReward.bind(scheme);
     gpAddress = contributionReward.votingMachine();
     let voteParams = contributionReward.voteParams();
     if (!equalStrings(voteParams.toHex(), addressZero)) {
       setContributionRewardParams(dao, scheme, gpAddress, voteParams);
       isGPQue = true;
     }
   }
   if (equalStrings(contractInfo.name, 'ContributionRewardExt')) {
    let contributionRewardExt =  ContributionRewardExt.bind(scheme);
    setContributionRewardExtParams(
                    dao,
                    scheme,
                    contributionRewardExt.votingMachine(),
                    contributionRewardExt.voteParams(),
                    contributionRewardExt.rewarder());
    isGPQue = true;
   }

   if (equalStrings(contractInfo.name, 'SchemeFactory')) {
    let schemeFactory =  SchemeFactory.bind(scheme);
    gpAddress = schemeFactory.votingMachine();
    let voteParams = schemeFactory.voteParams();
    let daoFactory = schemeFactory.daoFactory();
    if (!equalStrings(gpAddress.toHex(), addressZero)) {
        setSchemeFactoryParams(dao, scheme, gpAddress, voteParams, daoFactory);
        isGPQue = true;
    }
  }

   if (equalStrings(contractInfo.name, 'SchemeRegistrar')) {
     let schemeRegistrar =  SchemeRegistrar.bind(scheme);
     gpAddress = schemeRegistrar.votingMachine();
     let voteRegisterParams = schemeRegistrar.voteRegisterParams();
     let voteRemoveParams = schemeRegistrar.voteRemoveParams();
     if (!equalStrings(gpAddress.toHex(), addressZero)) {
         setSchemeRegistrarParams(dao, scheme, gpAddress, voteRegisterParams, voteRemoveParams);
         isGPQue = true;
     }
   }

   if (equalStrings(contractInfo.name, 'GenericScheme')) {
    let genericScheme =  GenericScheme.bind(scheme);
    gpAddress = genericScheme.votingMachine();
    let voteParams = genericScheme.voteParams();
    let contractToCall = genericScheme.contractToCall();
    if (!equalStrings(gpAddress.toHex(), addressZero)) {
        setGenericSchemeParams(dao, scheme, gpAddress, voteParams, contractToCall);
        isGPQue = true;
    }
  }

   if (equalStrings(contractInfo.name, 'UpgradeScheme')) {
    let upgradeScheme =  UpgradeScheme.bind(scheme);
    gpAddress = upgradeScheme.votingMachine();
    let voteParams = upgradeScheme.voteParams();
    let arcPackage = upgradeScheme.arcPackage();
    if (!equalStrings(gpAddress.toHex(), addressZero)) {
        setUpgradeSchemeParams(dao, scheme, gpAddress, voteParams, arcPackage);
        isGPQue = true;
    }
  }

   if (equalStrings(contractInfo.name, 'JoinAndQuit')) {
    let joinAndQuit =  JoinAndQuit.bind(scheme);
    gpAddress = joinAndQuit.votingMachine();
    let voteParams = joinAndQuit.voteParams();
    let fundingToken = joinAndQuit.fundingToken();
    let minFeeToJoin = joinAndQuit.minFeeToJoin();
    let memberReputation = joinAndQuit.memberReputation();
    let fundingGoal = joinAndQuit.fundingGoal();
    let fundingGoalDeadLine = joinAndQuit.fundingGoalDeadLine();

    if (!equalStrings(gpAddress.toHex(), addressZero)) {
        setJoinAndQuitParams(
          dao,
          scheme,
          gpAddress,
          voteParams,
          fundingToken,
          minFeeToJoin,
          memberReputation,
          fundingGoal,
          fundingGoalDeadLine,
        );
        isGPQue = true;
    }
  }

   if (equalStrings(contractInfo.name, 'FundingRequest')) {
    let fundingRequest =  FundingRequest.bind(scheme);
    gpAddress = fundingRequest.votingMachine();
    let voteParams = fundingRequest.voteParams();
    let fundingToken = fundingRequest.fundingToken();

    if (!equalStrings(gpAddress.toHex(), addressZero)) {
        setFundingRequestParams(
          dao,
          scheme,
          gpAddress,
          voteParams,
          fundingToken,
        );
        isGPQue = true;
    }
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
