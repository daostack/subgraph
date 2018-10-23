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

export class GPExecuteProposal extends EthereumEvent {
  get params(): GPExecuteProposalParams {
    return new GPExecuteProposalParams(this);
  }
}

export class GPExecuteProposalParams {
  _event: GPExecuteProposal;

  constructor(event: GPExecuteProposal) {
    this._event = event;
  }

  get _proposalId(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _executionState(): u8 {
    return this._event.parameters[1].value.toU8();
  }
}

export class Stake extends EthereumEvent {
  get params(): StakeParams {
    return new StakeParams(this);
  }
}

export class StakeParams {
  _event: Stake;

  constructor(event: Stake) {
    this._event = event;
  }

  get _proposalId(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _avatar(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get _staker(): Address {
    return this._event.parameters[2].value.toAddress();
  }

  get _vote(): U256 {
    return this._event.parameters[3].value.toU256();
  }

  get _amount(): U256 {
    return this._event.parameters[4].value.toU256();
  }
}

export class Redeem extends EthereumEvent {
  get params(): RedeemParams {
    return new RedeemParams(this);
  }
}

export class RedeemParams {
  _event: Redeem;

  constructor(event: Redeem) {
    this._event = event;
  }

  get _proposalId(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _avatar(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get _beneficiary(): Address {
    return this._event.parameters[2].value.toAddress();
  }

  get _amount(): U256 {
    return this._event.parameters[3].value.toU256();
  }
}

export class RedeemDaoBounty extends EthereumEvent {
  get params(): RedeemDaoBountyParams {
    return new RedeemDaoBountyParams(this);
  }
}

export class RedeemDaoBountyParams {
  _event: RedeemDaoBounty;

  constructor(event: RedeemDaoBounty) {
    this._event = event;
  }

  get _proposalId(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _avatar(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get _beneficiary(): Address {
    return this._event.parameters[2].value.toAddress();
  }

  get _amount(): U256 {
    return this._event.parameters[3].value.toU256();
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

  get _proposalId(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _avatar(): Address {
    return this._event.parameters[1].value.toAddress();
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

export class NewProposal extends EthereumEvent {
  get params(): NewProposalParams {
    return new NewProposalParams(this);
  }
}

export class NewProposalParams {
  _event: NewProposal;

  constructor(event: NewProposal) {
    this._event = event;
  }

  get _proposalId(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _avatar(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get _numOfChoices(): U256 {
    return this._event.parameters[2].value.toU256();
  }

  get _proposer(): Address {
    return this._event.parameters[3].value.toAddress();
  }

  get _paramsHash(): Bytes {
    return this._event.parameters[4].value.toBytes();
  }
}

export class ExecuteProposal extends EthereumEvent {
  get params(): ExecuteProposalParams {
    return new ExecuteProposalParams(this);
  }
}

export class ExecuteProposalParams {
  _event: ExecuteProposal;

  constructor(event: ExecuteProposal) {
    this._event = event;
  }

  get _proposalId(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _avatar(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get _decision(): U256 {
    return this._event.parameters[2].value.toU256();
  }

  get _totalReputation(): U256 {
    return this._event.parameters[3].value.toU256();
  }
}

export class VoteProposal extends EthereumEvent {
  get params(): VoteProposalParams {
    return new VoteProposalParams(this);
  }
}

export class VoteProposalParams {
  _event: VoteProposal;

  constructor(event: VoteProposal) {
    this._event = event;
  }

  get _proposalId(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _avatar(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get _voter(): Address {
    return this._event.parameters[2].value.toAddress();
  }

  get _vote(): U256 {
    return this._event.parameters[3].value.toU256();
  }

  get _reputation(): U256 {
    return this._event.parameters[4].value.toU256();
  }
}

export class CancelProposal extends EthereumEvent {
  get params(): CancelProposalParams {
    return new CancelProposalParams(this);
  }
}

export class CancelProposalParams {
  _event: CancelProposal;

  constructor(event: CancelProposal) {
    this._event = event;
  }

  get _proposalId(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _avatar(): Address {
    return this._event.parameters[1].value.toAddress();
  }
}

export class CancelVoting extends EthereumEvent {
  get params(): CancelVotingParams {
    return new CancelVotingParams(this);
  }
}

export class CancelVotingParams {
  _event: CancelVoting;

  constructor(event: CancelVoting) {
    this._event = event;
  }

  get _proposalId(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get _avatar(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get _voter(): Address {
    return this._event.parameters[2].value.toAddress();
  }
}

export class GenesisProtocol__parametersResult {
  value0: U256;
  value1: U256;
  value2: U256;
  value3: U256;
  value4: U256;
  value5: U256;
  value6: U256;
  value7: U256;
  value8: U256;
  value9: U256;
  value10: U256;
  value11: U256;
  value12: U256;
  value13: U256;

  constructor(
    value0: U256,
    value1: U256,
    value2: U256,
    value3: U256,
    value4: U256,
    value5: U256,
    value6: U256,
    value7: U256,
    value8: U256,
    value9: U256,
    value10: U256,
    value11: U256,
    value12: U256,
    value13: U256
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
    this.value10 = value10;
    this.value11 = value11;
    this.value12 = value12;
    this.value13 = value13;
  }

  toMap(): TypedMap<string, EthereumValue> {
    let map = new TypedMap<string, EthereumValue>();
    map.set("value0", EthereumValue.fromU256(this.value0));
    map.set("value1", EthereumValue.fromU256(this.value1));
    map.set("value2", EthereumValue.fromU256(this.value2));
    map.set("value3", EthereumValue.fromU256(this.value3));
    map.set("value4", EthereumValue.fromU256(this.value4));
    map.set("value5", EthereumValue.fromU256(this.value5));
    map.set("value6", EthereumValue.fromU256(this.value6));
    map.set("value7", EthereumValue.fromU256(this.value7));
    map.set("value8", EthereumValue.fromU256(this.value8));
    map.set("value9", EthereumValue.fromU256(this.value9));
    map.set("value10", EthereumValue.fromU256(this.value10));
    map.set("value11", EthereumValue.fromU256(this.value11));
    map.set("value12", EthereumValue.fromU256(this.value12));
    map.set("value13", EthereumValue.fromU256(this.value13));
    return map;
  }
}

export class GenesisProtocol__proposalsResult {
  value0: Address;
  value1: U256;
  value2: Address;
  value3: U256;
  value4: U256;
  value5: U256;
  value6: u8;
  value7: U256;
  value8: Address;
  value9: U256;
  value10: Bytes;
  value11: U256;

  constructor(
    value0: Address,
    value1: U256,
    value2: Address,
    value3: U256,
    value4: U256,
    value5: U256,
    value6: u8,
    value7: U256,
    value8: Address,
    value9: U256,
    value10: Bytes,
    value11: U256
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
    this.value10 = value10;
    this.value11 = value11;
  }

  toMap(): TypedMap<string, EthereumValue> {
    let map = new TypedMap<string, EthereumValue>();
    map.set("value0", EthereumValue.fromAddress(this.value0));
    map.set("value1", EthereumValue.fromU256(this.value1));
    map.set("value2", EthereumValue.fromAddress(this.value2));
    map.set("value3", EthereumValue.fromU256(this.value3));
    map.set("value4", EthereumValue.fromU256(this.value4));
    map.set("value5", EthereumValue.fromU256(this.value5));
    map.set("value6", EthereumValue.fromU8(this.value6));
    map.set("value7", EthereumValue.fromU256(this.value7));
    map.set("value8", EthereumValue.fromAddress(this.value8));
    map.set("value9", EthereumValue.fromU256(this.value9));
    map.set("value10", EthereumValue.fromFixedBytes(this.value10));
    map.set("value11", EthereumValue.fromU256(this.value11));
    return map;
  }
}

export class GenesisProtocol__voteInfoResult {
  value0: U256;
  value1: U256;

  constructor(value0: U256, value1: U256) {
    this.value0 = value0;
    this.value1 = value1;
  }

  toMap(): TypedMap<string, EthereumValue> {
    let map = new TypedMap<string, EthereumValue>();
    map.set("value0", EthereumValue.fromU256(this.value0));
    map.set("value1", EthereumValue.fromU256(this.value1));
    return map;
  }
}

export class GenesisProtocol__proposalStatusResult {
  value0: U256;
  value1: U256;
  value2: U256;
  value3: U256;
  value4: U256;
  value5: U256;

  constructor(
    value0: U256,
    value1: U256,
    value2: U256,
    value3: U256,
    value4: U256,
    value5: U256
  ) {
    this.value0 = value0;
    this.value1 = value1;
    this.value2 = value2;
    this.value3 = value3;
    this.value4 = value4;
    this.value5 = value5;
  }

  toMap(): TypedMap<string, EthereumValue> {
    let map = new TypedMap<string, EthereumValue>();
    map.set("value0", EthereumValue.fromU256(this.value0));
    map.set("value1", EthereumValue.fromU256(this.value1));
    map.set("value2", EthereumValue.fromU256(this.value2));
    map.set("value3", EthereumValue.fromU256(this.value3));
    map.set("value4", EthereumValue.fromU256(this.value4));
    map.set("value5", EthereumValue.fromU256(this.value5));
    return map;
  }
}

export class GenesisProtocol__scoreThresholdParamsResult {
  value0: U256;
  value1: U256;

  constructor(value0: U256, value1: U256) {
    this.value0 = value0;
    this.value1 = value1;
  }

  toMap(): TypedMap<string, EthereumValue> {
    let map = new TypedMap<string, EthereumValue>();
    map.set("value0", EthereumValue.fromU256(this.value0));
    map.set("value1", EthereumValue.fromU256(this.value1));
    return map;
  }
}

export class GenesisProtocol__getStakerResult {
  value0: U256;
  value1: U256;

  constructor(value0: U256, value1: U256) {
    this.value0 = value0;
    this.value1 = value1;
  }

  toMap(): TypedMap<string, EthereumValue> {
    let map = new TypedMap<string, EthereumValue>();
    map.set("value0", EthereumValue.fromU256(this.value0));
    map.set("value1", EthereumValue.fromU256(this.value1));
    return map;
  }
}

export class GenesisProtocol__getAllowedRangeOfChoicesResult {
  value0: U256;
  value1: U256;

  constructor(value0: U256, value1: U256) {
    this.value0 = value0;
    this.value1 = value1;
  }

  toMap(): TypedMap<string, EthereumValue> {
    let map = new TypedMap<string, EthereumValue>();
    map.set("value0", EthereumValue.fromU256(this.value0));
    map.set("value1", EthereumValue.fromU256(this.value1));
    return map;
  }
}

export class GenesisProtocol extends SmartContract {
  static bind(address: Address): GenesisProtocol {
    return new GenesisProtocol("GenesisProtocol", address);
  }

  parameters(param0: Bytes): GenesisProtocol__parametersResult {
    let result = super.call("parameters", [
      EthereumValue.fromFixedBytes(param0)
    ]);
    return new GenesisProtocol__parametersResult(
      result[0].toU256(),
      result[1].toU256(),
      result[2].toU256(),
      result[3].toU256(),
      result[4].toU256(),
      result[5].toU256(),
      result[6].toU256(),
      result[7].toU256(),
      result[8].toU256(),
      result[9].toU256(),
      result[10].toU256(),
      result[11].toU256(),
      result[12].toU256(),
      result[13].toU256()
    );
  }

  NO(): U256 {
    let result = super.call("NO", []);
    return result[0].toU256();
  }

  proposalsCnt(): U256 {
    let result = super.call("proposalsCnt", []);
    return result[0].toU256();
  }

  DELEGATION_HASH_EIP712(): Bytes {
    let result = super.call("DELEGATION_HASH_EIP712", []);
    return result[0].toBytes();
  }

  proposals(param0: Bytes): GenesisProtocol__proposalsResult {
    let result = super.call("proposals", [
      EthereumValue.fromFixedBytes(param0)
    ]);
    return new GenesisProtocol__proposalsResult(
      result[0].toAddress(),
      result[1].toU256(),
      result[2].toAddress(),
      result[3].toU256(),
      result[4].toU256(),
      result[5].toU256(),
      result[6].toU8(),
      result[7].toU256(),
      result[8].toAddress(),
      result[9].toU256(),
      result[10].toBytes(),
      result[11].toU256()
    );
  }

  stakingToken(): Address {
    let result = super.call("stakingToken", []);
    return result[0].toAddress();
  }

  ETH_SIGN_PREFIX(): string {
    let result = super.call("ETH_SIGN_PREFIX", []);
    return result[0].toString();
  }

  owner(): Address {
    let result = super.call("owner", []);
    return result[0].toAddress();
  }

  NUM_OF_CHOICES(): U256 {
    let result = super.call("NUM_OF_CHOICES", []);
    return result[0].toU256();
  }

  YES(): U256 {
    let result = super.call("YES", []);
    return result[0].toU256();
  }

  hashedParameters(): Bytes {
    let result = super.call("hashedParameters", []);
    return result[0].toBytes();
  }

  getNumberOfChoices(_proposalId: Bytes): U256 {
    let result = super.call("getNumberOfChoices", [
      EthereumValue.fromFixedBytes(_proposalId)
    ]);
    return result[0].toU256();
  }

  voteInfo(
    _proposalId: Bytes,
    _voter: Address
  ): GenesisProtocol__voteInfoResult {
    let result = super.call("voteInfo", [
      EthereumValue.fromFixedBytes(_proposalId),
      EthereumValue.fromAddress(_voter)
    ]);
    return new GenesisProtocol__voteInfoResult(
      result[0].toU256(),
      result[1].toU256()
    );
  }

  voteStatus(_proposalId: Bytes, _choice: U256): U256 {
    let result = super.call("voteStatus", [
      EthereumValue.fromFixedBytes(_proposalId),
      EthereumValue.fromU256(_choice)
    ]);
    return result[0].toU256();
  }

  isVotable(_proposalId: Bytes): boolean {
    let result = super.call("isVotable", [
      EthereumValue.fromFixedBytes(_proposalId)
    ]);
    return result[0].toBoolean();
  }

  proposalStatus(_proposalId: Bytes): GenesisProtocol__proposalStatusResult {
    let result = super.call("proposalStatus", [
      EthereumValue.fromFixedBytes(_proposalId)
    ]);
    return new GenesisProtocol__proposalStatusResult(
      result[0].toU256(),
      result[1].toU256(),
      result[2].toU256(),
      result[3].toU256(),
      result[4].toU256(),
      result[5].toU256()
    );
  }

  proposalAvatar(_proposalId: Bytes): Address {
    let result = super.call("proposalAvatar", [
      EthereumValue.fromFixedBytes(_proposalId)
    ]);
    return result[0].toAddress();
  }

  scoreThresholdParams(
    _avatar: Address
  ): GenesisProtocol__scoreThresholdParamsResult {
    let result = super.call("scoreThresholdParams", [
      EthereumValue.fromAddress(_avatar)
    ]);
    return new GenesisProtocol__scoreThresholdParamsResult(
      result[0].toU256(),
      result[1].toU256()
    );
  }

  getStaker(
    _proposalId: Bytes,
    _staker: Address
  ): GenesisProtocol__getStakerResult {
    let result = super.call("getStaker", [
      EthereumValue.fromFixedBytes(_proposalId),
      EthereumValue.fromAddress(_staker)
    ]);
    return new GenesisProtocol__getStakerResult(
      result[0].toU256(),
      result[1].toU256()
    );
  }

  state(_proposalId: Bytes): u8 {
    let result = super.call("state", [
      EthereumValue.fromFixedBytes(_proposalId)
    ]);
    return result[0].toU8();
  }

  winningVote(_proposalId: Bytes): U256 {
    let result = super.call("winningVote", [
      EthereumValue.fromFixedBytes(_proposalId)
    ]);
    return result[0].toU256();
  }

  isAbstainAllow(): boolean {
    let result = super.call("isAbstainAllow", []);
    return result[0].toBoolean();
  }

  getAllowedRangeOfChoices(): GenesisProtocol__getAllowedRangeOfChoicesResult {
    let result = super.call("getAllowedRangeOfChoices", []);
    return new GenesisProtocol__getAllowedRangeOfChoicesResult(
      result[0].toU256(),
      result[1].toU256()
    );
  }

  shouldBoost(_proposalId: Bytes): boolean {
    let result = super.call("shouldBoost", [
      EthereumValue.fromFixedBytes(_proposalId)
    ]);
    return result[0].toBoolean();
  }

  score(_proposalId: Bytes): I256 {
    let result = super.call("score", [
      EthereumValue.fromFixedBytes(_proposalId)
    ]);
    return result[0].toI256();
  }

  getBoostedProposalsCount(_avatar: Address): U256 {
    let result = super.call("getBoostedProposalsCount", [
      EthereumValue.fromAddress(_avatar)
    ]);
    return result[0].toU256();
  }

  threshold(_paramsHash: Bytes, _avatar: Address): I256 {
    let result = super.call("threshold", [
      EthereumValue.fromFixedBytes(_paramsHash),
      EthereumValue.fromAddress(_avatar)
    ]);
    return result[0].toI256();
  }

  getParametersHash(_params: Array<U256>): Bytes {
    let result = super.call("getParametersHash", [
      EthereumValue.fromI256(_params)
    ]);
    return result[0].toBytes();
  }
}
