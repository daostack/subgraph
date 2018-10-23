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

export class NewOrg extends EthereumEvent {
  get params(): NewOrgParams {
    return new NewOrgParams(this);
  }
}

export class NewOrgParams {
  _event: NewOrg;

  constructor(event: NewOrg) {
    this._event = event;
  }

  get _avatar(): Address {
    return this._event.parameters[0].value.toAddress();
  }
}

export class InitialSchemesSet extends EthereumEvent {
  get params(): InitialSchemesSetParams {
    return new InitialSchemesSetParams(this);
  }
}

export class InitialSchemesSetParams {
  _event: InitialSchemesSet;

  constructor(event: InitialSchemesSet) {
    this._event = event;
  }

  get _avatar(): Address {
    return this._event.parameters[0].value.toAddress();
  }
}

export class DaoCreator extends SmartContract {
  static bind(address: Address): DaoCreator {
    return new DaoCreator("DaoCreator", address);
  }

  locks(param0: Address): Address {
    let result = super.call("locks", [EthereumValue.fromAddress(param0)]);
    return result[0].toAddress();
  }
}
