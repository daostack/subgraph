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

export class Mint extends EthereumEvent {
  get params(): MintParams {
    return new MintParams(this);
  }
}

export class MintParams {
  _event: Mint;

  constructor(event: Mint) {
    this._event = event;
  }

  get _to(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _amount(): U256 {
    return this._event.parameters[1].value.toU256();
  }
}

export class Burn extends EthereumEvent {
  get params(): BurnParams {
    return new BurnParams(this);
  }
}

export class BurnParams {
  _event: Burn;

  constructor(event: Burn) {
    this._event = event;
  }

  get _from(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get _amount(): U256 {
    return this._event.parameters[1].value.toU256();
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

export class Reputation extends SmartContract {
  static bind(address: Address): Reputation {
    return new Reputation("Reputation", address);
  }

  totalSupply(): U256 {
    let result = super.call("totalSupply", []);
    return result[0].toU256();
  }

  balances(param0: Address): U256 {
    let result = super.call("balances", [EthereumValue.fromAddress(param0)]);
    return result[0].toU256();
  }

  decimals(): U256 {
    let result = super.call("decimals", []);
    return result[0].toU256();
  }

  owner(): Address {
    let result = super.call("owner", []);
    return result[0].toAddress();
  }

  reputationOf(_owner: Address): U256 {
    let result = super.call("reputationOf", [
      EthereumValue.fromAddress(_owner)
    ]);
    return result[0].toU256();
  }
}
