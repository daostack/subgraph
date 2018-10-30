import {
  EthereumEvent,
  SmartContract,
  EthereumValue,
  JSONValue,
  TypedMap,
  Entity,
  Bytes,
  Address,
  I128,
  U128,
  I256,
  U256,
  H256
} from "@graphprotocol/graph-ts";

export class NewContributionProposal extends EthereumEvent {
  get params(): NewContributionProposalParams {
    return new NewContributionProposalParams(this);
  }
}

export class NewContributionProposalParams {
  _event: NewContributionProposal;

  constructor(event: NewContributionProposal) {
    this._event = event;
  }

  get _avatar(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _proposalId(): Bytes {
    return this._event.parameters[1].value.toBytes();
  }

  get _intVoteInterface(): Address {
    return this._event.parameters[2].value.toAddress();
  }

  get _contributionDescription(): Bytes {
    return this._event.parameters[3].value.toBytes();
  }

  get _reputationChange(): I256 {
    return this._event.parameters[4].value.toI256();
  }

  get _rewards(): Array<U256> {
    return this._event.parameters[5].value.toU256Array();
  }

  get _externalToken(): Address {
    return this._event.parameters[6].value.toAddress();
  }

  get _beneficiary(): Address {
    return this._event.parameters[7].value.toAddress();
  }
}

export class ProposalExecuted extends EthereumEvent {
  get params(): ProposalExecutedParams {
    return new ProposalExecutedParams(this);
  }
}

export class ProposalExecutedParams {
  _event: ProposalExecuted;

  constructor(event: ProposalExecuted) {
    this._event = event;
  }

  get _avatar(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _proposalId(): Bytes {
    return this._event.parameters[1].value.toBytes();
  }

  get _param(): I256 {
    return this._event.parameters[2].value.toI256();
  }
}

export class RedeemReputation extends EthereumEvent {
  get params(): RedeemReputationParams {
    return new RedeemReputationParams(this);
  }
}

export class RedeemReputationParams {
  _event: RedeemReputation;

  constructor(event: RedeemReputation) {
    this._event = event;
  }

  get _avatar(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _proposalId(): Bytes {
    return this._event.parameters[1].value.toBytes();
  }

  get _beneficiary(): Address {
    return this._event.parameters[2].value.toAddress();
  }

  get _amount(): I256 {
    return this._event.parameters[3].value.toI256();
  }
}

export class RedeemEther extends EthereumEvent {
  get params(): RedeemEtherParams {
    return new RedeemEtherParams(this);
  }
}

export class RedeemEtherParams {
  _event: RedeemEther;

  constructor(event: RedeemEther) {
    this._event = event;
  }

  get _avatar(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _proposalId(): Bytes {
    return this._event.parameters[1].value.toBytes();
  }

  get _beneficiary(): Address {
    return this._event.parameters[2].value.toAddress();
  }

  get _amount(): U256 {
    return this._event.parameters[3].value.toU256();
  }
}

export class RedeemNativeToken extends EthereumEvent {
  get params(): RedeemNativeTokenParams {
    return new RedeemNativeTokenParams(this);
  }
}

export class RedeemNativeTokenParams {
  _event: RedeemNativeToken;

  constructor(event: RedeemNativeToken) {
    this._event = event;
  }

  get _avatar(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _proposalId(): Bytes {
    return this._event.parameters[1].value.toBytes();
  }

  get _beneficiary(): Address {
    return this._event.parameters[2].value.toAddress();
  }

  get _amount(): U256 {
    return this._event.parameters[3].value.toU256();
  }
}

export class RedeemExternalToken extends EthereumEvent {
  get params(): RedeemExternalTokenParams {
    return new RedeemExternalTokenParams(this);
  }
}

export class RedeemExternalTokenParams {
  _event: RedeemExternalToken;

  constructor(event: RedeemExternalToken) {
    this._event = event;
  }

  get _avatar(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _proposalId(): Bytes {
    return this._event.parameters[1].value.toBytes();
  }

  get _beneficiary(): Address {
    return this._event.parameters[2].value.toAddress();
  }

  get _amount(): U256 {
    return this._event.parameters[3].value.toU256();
  }
}

export class OwnershipRenounced extends EthereumEvent {
  get params(): OwnershipRenouncedParams {
    return new OwnershipRenouncedParams(this);
  }
}

export class OwnershipRenouncedParams {
  _event: OwnershipRenounced;

  constructor(event: OwnershipRenounced) {
    this._event = event;
  }

  get previousOwner(): Address {
    return this._event.parameters[0].value.toAddress();
  }
}

export class OwnershipTransferred extends EthereumEvent {
  get params(): OwnershipTransferredParams {
    return new OwnershipTransferredParams(this);
  }
}

export class OwnershipTransferredParams {
  _event: OwnershipTransferred;

  constructor(event: OwnershipTransferred) {
    this._event = event;
  }

  get previousOwner(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get newOwner(): Address {
    return this._event.parameters[1].value.toAddress();
  }
}

export class ContributionReward__parametersResult {
  value0: U256;
  value1: Bytes;
  value2: Address;

  constructor(value0: U256, value1: Bytes, value2: Address) {
    this.value0 = value0;
    this.value1 = value1;
    this.value2 = value2;
  }

  toMap(): TypedMap<string, EthereumValue> {
    let map = new TypedMap<string, EthereumValue>();
    map.set("value0", EthereumValue.fromU256(this.value0));
    map.set("value1", EthereumValue.fromFixedBytes(this.value1));
    map.set("value2", EthereumValue.fromAddress(this.value2));
    return map;
  }
}

export class ContributionReward__organizationsProposalsResult {
  value0: Bytes;
  value1: U256;
  value2: I256;
  value3: U256;
  value4: Address;
  value5: U256;
  value6: Address;
  value7: U256;
  value8: U256;
  value9: U256;

  constructor(
    value0: Bytes,
    value1: U256,
    value2: I256,
    value3: U256,
    value4: Address,
    value5: U256,
    value6: Address,
    value7: U256,
    value8: U256,
    value9: U256
  ) {
    this.value0 = value0;
    this.value1 = value1;
    this.value2 = value2;
    this.value3 = value3;
    this.value4 = value4;
    this.value5 = value5;
    this.value6 = value6;
    this.value7 = value7;
    this.value8 = value8;
    this.value9 = value9;
  }

  toMap(): TypedMap<string, EthereumValue> {
    let map = new TypedMap<string, EthereumValue>();
    map.set("value0", EthereumValue.fromFixedBytes(this.value0));
    map.set("value1", EthereumValue.fromU256(this.value1));
    map.set("value2", EthereumValue.fromI256(this.value2));
    map.set("value3", EthereumValue.fromU256(this.value3));
    map.set("value4", EthereumValue.fromAddress(this.value4));
    map.set("value5", EthereumValue.fromU256(this.value5));
    map.set("value6", EthereumValue.fromAddress(this.value6));
    map.set("value7", EthereumValue.fromU256(this.value7));
    map.set("value8", EthereumValue.fromU256(this.value8));
    map.set("value9", EthereumValue.fromU256(this.value9));
    return map;
  }
}

export class ContributionReward extends SmartContract {
  static bind(address: Address): ContributionReward {
    return new ContributionReward("ContributionReward", address);
  }

  parameters(param0: Bytes): ContributionReward__parametersResult {
    let result = super.call("parameters", [
      EthereumValue.fromFixedBytes(param0)
    ]);
    return new ContributionReward__parametersResult(
      result[0].toU256(),
      result[1].toBytes(),
      result[2].toAddress()
    );
  }

  organizationsProposals(
    param0: Address,
    param1: Bytes
  ): ContributionReward__organizationsProposalsResult {
    let result = super.call("organizationsProposals", [
      EthereumValue.fromAddress(param0),
      EthereumValue.fromFixedBytes(param1)
    ]);
    return new ContributionReward__organizationsProposalsResult(
      result[0].toBytes(),
      result[1].toU256(),
      result[2].toI256(),
      result[3].toU256(),
      result[4].toAddress(),
      result[5].toU256(),
      result[6].toAddress(),
      result[7].toU256(),
      result[8].toU256(),
      result[9].toU256()
    );
  }

  balanceOfStakingToken(_stakingToken: Address, _proposalId: Bytes): U256 {
    let result = super.call("balanceOfStakingToken", [
      EthereumValue.fromAddress(_stakingToken),
      EthereumValue.fromFixedBytes(_proposalId)
    ]);
    return result[0].toU256();
  }

  owner(): Address {
    let result = super.call("owner", []);
    return result[0].toAddress();
  }

  reputationOf(_owner: Address, _proposalId: Bytes): U256 {
    let result = super.call("reputationOf", [
      EthereumValue.fromAddress(_owner),
      EthereumValue.fromFixedBytes(_proposalId)
    ]);
    return result[0].toU256();
  }

  getTotalReputationSupply(_proposalId: Bytes): U256 {
    let result = super.call("getTotalReputationSupply", [
      EthereumValue.fromFixedBytes(_proposalId)
    ]);
    return result[0].toU256();
  }

  hashedParameters(): Bytes {
    let result = super.call("hashedParameters", []);
    return result[0].toBytes();
  }

  getParametersHash(
    _orgNativeTokenFee: U256,
    _voteApproveParams: Bytes,
    _intVote: Address
  ): Bytes {
    let result = super.call("getParametersHash", [
      EthereumValue.fromU256(_orgNativeTokenFee),
      EthereumValue.fromFixedBytes(_voteApproveParams),
      EthereumValue.fromAddress(_intVote)
    ]);
    return result[0].toBytes();
  }

  getPeriodsToPay(
    _proposalId: Bytes,
    _avatar: Address,
    _redeemType: U256
  ): U256 {
    let result = super.call("getPeriodsToPay", [
      EthereumValue.fromFixedBytes(_proposalId),
      EthereumValue.fromAddress(_avatar),
      EthereumValue.fromU256(_redeemType)
    ]);
    return result[0].toU256();
  }

  getRedeemedPeriods(
    _proposalId: Bytes,
    _avatar: Address,
    _redeemType: U256
  ): U256 {
    let result = super.call("getRedeemedPeriods", [
      EthereumValue.fromFixedBytes(_proposalId),
      EthereumValue.fromAddress(_avatar),
      EthereumValue.fromU256(_redeemType)
    ]);
    return result[0].toU256();
  }

  getProposalEthReward(_proposalId: Bytes, _avatar: Address): U256 {
    let result = super.call("getProposalEthReward", [
      EthereumValue.fromFixedBytes(_proposalId),
      EthereumValue.fromAddress(_avatar)
    ]);
    return result[0].toU256();
  }

  getProposalExternalTokenReward(_proposalId: Bytes, _avatar: Address): U256 {
    let result = super.call("getProposalExternalTokenReward", [
      EthereumValue.fromFixedBytes(_proposalId),
      EthereumValue.fromAddress(_avatar)
    ]);
    return result[0].toU256();
  }

  getProposalExternalToken(_proposalId: Bytes, _avatar: Address): Address {
    let result = super.call("getProposalExternalToken", [
      EthereumValue.fromFixedBytes(_proposalId),
      EthereumValue.fromAddress(_avatar)
    ]);
    return result[0].toAddress();
  }

  getProposalExecutionTime(_proposalId: Bytes, _avatar: Address): U256 {
    let result = super.call("getProposalExecutionTime", [
      EthereumValue.fromFixedBytes(_proposalId),
      EthereumValue.fromAddress(_avatar)
    ]);
    return result[0].toU256();
  }
}
