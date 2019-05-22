import {
Address,
BigInt,
Bytes,
EthereumValue,
SmartContract,
TypedMap,
} from '@graphprotocol/graph-ts';
import * as Addresses from './addresses';
import { equalStrings } from './utils';

import { Avatar as Avatar16 } from './types/Avatar/0.0.1-rc.16/Avatar';
import { Avatar as Avatar19 } from './types/Avatar/0.0.1-rc.19/Avatar';
import { DAOToken as DAOToken16 } from './types/DAOToken/0.0.1-rc.16/DAOToken';
import { DAOToken as DAOToken19 } from './types/DAOToken/0.0.1-rc.19/DAOToken';
import {
GenesisProtocol as GenesisProtocol16,
GenesisProtocol__voteInfoResult as GenesisProtocol16__voteInfoResult,
} from './types/GenesisProtocol/0.0.1-rc.16/GenesisProtocol';
import {
GenesisProtocol as GenesisProtocol19,
GenesisProtocol__voteInfoResult as GenesisProtocol19__voteInfoResult,
} from './types/GenesisProtocol/0.0.1-rc.19/GenesisProtocol';

import { Reputation as Reputation16 } from './types/Reputation/0.0.1-rc.16/Reputation';
import { Reputation as Reputation19 } from './types/Reputation/0.0.1-rc.19/Reputation';

// this is a hack :)
export class GenesisProtocol16Ext extends SmartContract {
    public static bind(address: Address): GenesisProtocol16Ext {
        return new GenesisProtocol16Ext('GenesisProtocol', address);
    }

    public redeem(proposalId: Bytes, beneficiary: Address): BigInt[] {
        let result = super.call('redeem', [
        EthereumValue.fromFixedBytes(proposalId),
        EthereumValue.fromAddress(beneficiary),
        ]);
        return result[0].toBigIntArray();
    }

    public redeemDaoBounty(proposalId: Bytes, beneficiary: Address): GenesisProtocol16__voteInfoResult {
        let result = super.call('redeemDaoBounty', [
        EthereumValue.fromFixedBytes(proposalId),
        EthereumValue.fromAddress(beneficiary),
        ]);
        return new GenesisProtocol16__voteInfoResult(
        result[0].toBigInt(),
        result[1].toBigInt(),
        );
    }
}

// this is a hack :)
// tslint:disable-next-line: max-classes-per-file
export class GenesisProtocol19Ext extends SmartContract {
    public static bind(address: Address): GenesisProtocol19Ext {
        return new GenesisProtocol19Ext('GenesisProtocol', address);
    }

    public redeem(proposalId: Bytes, beneficiary: Address): BigInt[] {
        let result = super.call('redeem', [
        EthereumValue.fromFixedBytes(proposalId),
        EthereumValue.fromAddress(beneficiary),
        ]);
        return result[0].toBigIntArray();
    }

    public redeemDaoBounty(proposalId: Bytes, beneficiary: Address): GenesisProtocol19__voteInfoResult {
        let result = super.call('redeemDaoBounty', [
        EthereumValue.fromFixedBytes(proposalId),
        EthereumValue.fromAddress(beneficiary),
        ]);
        return new GenesisProtocol19__voteInfoResult(
        result[0].toBigInt(),
        result[1].toBigInt(),
        );
    }
}

export function getGPThreshold(address: Address, paramsHash: Bytes, organizationId: Bytes): BigInt {
    if (isAddressInArray(Addresses.GenesisProtocol16Addresses, address)) {
            return GenesisProtocol16.bind(address).threshold(paramsHash, organizationId);
    } else {
            return GenesisProtocol19.bind(address).threshold(paramsHash, organizationId);
    }
}

export function getGPProposalTimes(address: Address, proposalId: Bytes): BigInt[] {
    if (isAddressInArray(Addresses.GenesisProtocol16Addresses, address)) {
            return GenesisProtocol16.bind(address).getProposalTimes(proposalId);
    } else {
            return GenesisProtocol19.bind(address).getProposalTimes(proposalId);
    }
}

export function getGPParameters(address: Address, paramsHash: Bytes): TypedMap<string, EthereumValue> {
    if (isAddressInArray(Addresses.GenesisProtocol16Addresses, address)) {
            return GenesisProtocol16.bind(address).parameters(paramsHash).toMap();
    } else {
            return GenesisProtocol19.bind(address).parameters(paramsHash).toMap();
    }
}

export function getGPProposal(address: Address, proposalId: Bytes): TypedMap<string, EthereumValue> {
    if (isAddressInArray(Addresses.GenesisProtocol16Addresses, address)) {
            return GenesisProtocol16.bind(address).proposals(proposalId).toMap();
    } else {
            return GenesisProtocol19.bind(address).proposals(proposalId).toMap();
    }
}

export function getGPVoteStake(address: Address, proposalId: Bytes, vote: BigInt): BigInt {
    if (isAddressInArray(Addresses.GenesisProtocol16Addresses, address)) {
            return GenesisProtocol16.bind(address).voteStake(proposalId, vote);
    } else {
            return GenesisProtocol19.bind(address).voteStake(proposalId, vote);
    }
}

export function getGPExtRedeem(address: Address, proposalId: Bytes, beneficiary: Address): BigInt[] {
    if (isAddressInArray(Addresses.GenesisProtocol16Addresses, address)) {
            return GenesisProtocol16Ext.bind(address).redeem(proposalId, beneficiary);
    } else {
            return GenesisProtocol19Ext.bind(address).redeem(proposalId, beneficiary);
    }
}

export function getGPExtRedeemDaoBounty(
address: Address,
proposalId: Bytes,
beneficiary: Address,
): TypedMap<string, EthereumValue> {
    if (isAddressInArray(Addresses.GenesisProtocol16Addresses, address)) {
            return GenesisProtocol16Ext.bind(address).redeemDaoBounty(proposalId, beneficiary).toMap();
    } else {
            return GenesisProtocol19Ext.bind(address).redeemDaoBounty(proposalId, beneficiary).toMap();
    }
}

export function getGPStakingToken(address: Address): Address {
    if (isAddressInArray(Addresses.GenesisProtocol16Addresses, address)) {
            return GenesisProtocol16.bind(address).stakingToken();
    } else {
            return GenesisProtocol19.bind(address).stakingToken();
    }
}

export function getDAOTokenName(address: Address): string {
    if (isAddressInArray(Addresses.DAOToken16Addresses, address)) {
            return DAOToken16.bind(address).name();
    } else {
            return DAOToken19.bind(address).name();
    }
}

export function getDAOTokenSymbol(address: Address): string {
    if (isAddressInArray(Addresses.DAOToken16Addresses, address)) {
            return DAOToken16.bind(address).symbol();
    } else {
            return DAOToken19.bind(address).symbol();
    }
}

export function getDAOTokenSupply(address: Address): BigInt {
    if (isAddressInArray(Addresses.DAOToken16Addresses, address)) {
            return DAOToken16.bind(address).totalSupply();
    } else {
            return DAOToken19.bind(address).totalSupply();
    }
}

export function getRepSupply(address: Address): BigInt {
    if (isAddressInArray(Addresses.Reputation16Addresses, address)) {
            return Reputation16.bind(address).totalSupply();
    } else {
            return Reputation19.bind(address).totalSupply();
    }
}

export function getAvatarName(address: Address): string {
    if (isAddressInArray(Addresses.Avatar16Addresses, address)) {
            return Avatar16.bind(address).orgName();
    } else {
            return Avatar19.bind(address).orgName();
    }
}

export function getAvatarToken(address: Address): Address {
    if (isAddressInArray(Addresses.Avatar16Addresses, address)) {
            return Avatar16.bind(address).nativeToken();
    } else {
            return Avatar19.bind(address).nativeToken();
    }
}

export function getAvatarReputation(address: Address): Address {
    if (isAddressInArray(Addresses.Avatar16Addresses, address)) {
            return Avatar16.bind(address).nativeReputation();
    } else {
            return Avatar19.bind(address).nativeReputation();
    }
}

function isAddressInArray(array: string[], address: Address): boolean {
    for (let i = 0; i < array.length; i++) {
        if (equalStrings(array[i], address.toHex())) {
        return true;
        }
    }
    return false;
}
