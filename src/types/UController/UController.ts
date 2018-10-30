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

export class MintReputation extends EthereumEvent {
  get params(): MintReputationParams {
    return new MintReputationParams(this);
  }
}

export class MintReputationParams {
  _event: MintReputation;

  constructor(event: MintReputation) {
    this._event = event;
  }

  get _sender(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _to(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get _amount(): U256 {
    return this._event.parameters[2].value.toU256();
  }

  get _avatar(): Address {
    return this._event.parameters[3].value.toAddress();
  }
}

export class BurnReputation extends EthereumEvent {
  get params(): BurnReputationParams {
    return new BurnReputationParams(this);
  }
}

export class BurnReputationParams {
  _event: BurnReputation;

  constructor(event: BurnReputation) {
    this._event = event;
  }

  get _sender(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _from(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get _amount(): U256 {
    return this._event.parameters[2].value.toU256();
  }

  get _avatar(): Address {
    return this._event.parameters[3].value.toAddress();
  }
}

export class MintTokens extends EthereumEvent {
  get params(): MintTokensParams {
    return new MintTokensParams(this);
  }
}

export class MintTokensParams {
  _event: MintTokens;

  constructor(event: MintTokens) {
    this._event = event;
  }

  get _sender(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _beneficiary(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get _amount(): U256 {
    return this._event.parameters[2].value.toU256();
  }

  get _avatar(): Address {
    return this._event.parameters[3].value.toAddress();
  }
}

export class RegisterScheme extends EthereumEvent {
  get params(): RegisterSchemeParams {
    return new RegisterSchemeParams(this);
  }
}

export class RegisterSchemeParams {
  _event: RegisterScheme;

  constructor(event: RegisterScheme) {
    this._event = event;
  }

  get _sender(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _scheme(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get _avatar(): Address {
    return this._event.parameters[2].value.toAddress();
  }
}

export class UnregisterScheme extends EthereumEvent {
  get params(): UnregisterSchemeParams {
    return new UnregisterSchemeParams(this);
  }
}

export class UnregisterSchemeParams {
  _event: UnregisterScheme;

  constructor(event: UnregisterScheme) {
    this._event = event;
  }

  get _sender(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _scheme(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get _avatar(): Address {
    return this._event.parameters[2].value.toAddress();
  }
}

export class UpgradeController extends EthereumEvent {
  get params(): UpgradeControllerParams {
    return new UpgradeControllerParams(this);
  }
}

export class UpgradeControllerParams {
  _event: UpgradeController;

  constructor(event: UpgradeController) {
    this._event = event;
  }

  get _oldController(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _newController(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get _avatar(): Address {
    return this._event.parameters[2].value.toAddress();
  }
}

export class AddGlobalConstraint extends EthereumEvent {
  get params(): AddGlobalConstraintParams {
    return new AddGlobalConstraintParams(this);
  }
}

export class AddGlobalConstraintParams {
  _event: AddGlobalConstraint;

  constructor(event: AddGlobalConstraint) {
    this._event = event;
  }

  get _globalConstraint(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _params(): Bytes {
    return this._event.parameters[1].value.toBytes();
  }

  get _when(): u8 {
    return this._event.parameters[2].value.toU8();
  }

  get _avatar(): Address {
    return this._event.parameters[3].value.toAddress();
  }
}

export class RemoveGlobalConstraint extends EthereumEvent {
  get params(): RemoveGlobalConstraintParams {
    return new RemoveGlobalConstraintParams(this);
  }
}

export class RemoveGlobalConstraintParams {
  _event: RemoveGlobalConstraint;

  constructor(event: RemoveGlobalConstraint) {
    this._event = event;
  }

  get _globalConstraint(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _index(): U256 {
    return this._event.parameters[1].value.toU256();
  }

  get _isPre(): boolean {
    return this._event.parameters[2].value.toBoolean();
  }

  get _avatar(): Address {
    return this._event.parameters[3].value.toAddress();
  }
}

export class UController__organizationsResult {
  value0: Address;
  value1: Address;
  value2: boolean;

  constructor(value0: Address, value1: Address, value2: boolean) {
    this.value0 = value0;
    this.value1 = value1;
    this.value2 = value2;
  }

  toMap(): TypedMap<string, EthereumValue> {
    let map = new TypedMap<string, EthereumValue>();
    map.set("value0", EthereumValue.fromAddress(this.value0));
    map.set("value1", EthereumValue.fromAddress(this.value1));
    map.set("value2", EthereumValue.fromBoolean(this.value2));
    return map;
  }
}

export class UController__globalConstraintsCountResult {
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

export class UController extends SmartContract {
  static bind(address: Address): UController {
    return new UController("UController", address);
  }

  reputations(param0: Address): boolean {
    let result = super.call("reputations", [EthereumValue.fromAddress(param0)]);
    return result[0].toBoolean();
  }

  newControllers(param0: Address): Address {
    let result = super.call("newControllers", [
      EthereumValue.fromAddress(param0)
    ]);
    return result[0].toAddress();
  }

  organizations(param0: Address): UController__organizationsResult {
    let result = super.call("organizations", [
      EthereumValue.fromAddress(param0)
    ]);
    return new UController__organizationsResult(
      result[0].toAddress(),
      result[1].toAddress(),
      result[2].toBoolean()
    );
  }

  tokens(param0: Address): boolean {
    let result = super.call("tokens", [EthereumValue.fromAddress(param0)]);
    return result[0].toBoolean();
  }

  isSchemeRegistered(_scheme: Address, _avatar: Address): boolean {
    let result = super.call("isSchemeRegistered", [
      EthereumValue.fromAddress(_scheme),
      EthereumValue.fromAddress(_avatar)
    ]);
    return result[0].toBoolean();
  }

  getSchemeParameters(_scheme: Address, _avatar: Address): Bytes {
    let result = super.call("getSchemeParameters", [
      EthereumValue.fromAddress(_scheme),
      EthereumValue.fromAddress(_avatar)
    ]);
    return result[0].toBytes();
  }

  getSchemePermissions(_scheme: Address, _avatar: Address): Bytes {
    let result = super.call("getSchemePermissions", [
      EthereumValue.fromAddress(_scheme),
      EthereumValue.fromAddress(_avatar)
    ]);
    return result[0].toBytes();
  }

  getGlobalConstraintParameters(
    _globalConstraint: Address,
    _avatar: Address
  ): Bytes {
    let result = super.call("getGlobalConstraintParameters", [
      EthereumValue.fromAddress(_globalConstraint),
      EthereumValue.fromAddress(_avatar)
    ]);
    return result[0].toBytes();
  }

  globalConstraintsCount(
    _avatar: Address
  ): UController__globalConstraintsCountResult {
    let result = super.call("globalConstraintsCount", [
      EthereumValue.fromAddress(_avatar)
    ]);
    return new UController__globalConstraintsCountResult(
      result[0].toU256(),
      result[1].toU256()
    );
  }

  isGlobalConstraintRegistered(
    _globalConstraint: Address,
    _avatar: Address
  ): boolean {
    let result = super.call("isGlobalConstraintRegistered", [
      EthereumValue.fromAddress(_globalConstraint),
      EthereumValue.fromAddress(_avatar)
    ]);
    return result[0].toBoolean();
  }

  getNativeReputation(_avatar: Address): Address {
    let result = super.call("getNativeReputation", [
      EthereumValue.fromAddress(_avatar)
    ]);
    return result[0].toAddress();
  }
}
