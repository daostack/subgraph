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

  creationBlock(): U256 {
    let result = super.call("creationBlock", []);
    return result[0].toU256();
  }

  decimals(): u8 {
    let result = super.call("decimals", []);
    return result[0].toU8();
  }

  owner(): Address {
    let result = super.call("owner", []);
    return result[0].toAddress();
  }

  totalSupply(): U256 {
    let result = super.call("totalSupply", []);
    return result[0].toU256();
  }

  balanceOf(_owner: Address): U256 {
    let result = super.call("balanceOf", [EthereumValue.fromAddress(_owner)]);
    return result[0].toU256();
  }

  balanceOfAt(_owner: Address, _blockNumber: U256): U256 {
    let result = super.call("balanceOfAt", [
      EthereumValue.fromAddress(_owner),
      EthereumValue.fromU256(_blockNumber)
    ]);
    return result[0].toU256();
  }

  totalSupplyAt(_blockNumber: U256): U256 {
    let result = super.call("totalSupplyAt", [
      EthereumValue.fromU256(_blockNumber)
    ]);
    return result[0].toU256();
  }
}
