import { Address, BigInt, Bytes, crypto, store } from '@graphprotocol/graph-ts';

// Import event types from the Token contract ABI
import {
  Approval,
  DAOToken,
  OwnershipTransferred,
  Transfer,
} from '../../types/DAOToken/DAOToken';
import { concat, eventId, save } from '../../utils';

// Import entity types generated from the GraphQL schema
import {
  Allowance,
  TokenApproval,
  TokenContract,
  TokenHolder,
  TokenTransfer,
} from '../../types/schema';

import * as domain from '../../domain';

function update(contract: Address, owner: Address, timestamp: BigInt): void {
  let token = DAOToken.bind(contract);
  let ent = new TokenHolder(crypto.keccak256(concat(contract, owner)).toHex());
  ent.contract = contract;
  ent.address = owner;
  let balance = token.balanceOf(owner);
  ent.balance = balance;

  if (!balance.isZero()) {
    save(ent, 'TokenHolder', timestamp);
  } else {
    // TODO: What about that?
    store.remove('TokenHolder', ent.id);
  }

  updateTokenContract(contract, ent.id, timestamp);
}

export function handleTransfer(event: Transfer): void {
  domain.handleNativeTokenTransfer(event);

  update(event.address, event.params.to as Address, event.block.timestamp);
  update(event.address, event.params.from as Address, event.block.timestamp);
  let ent = new TokenTransfer(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.from = event.params.from;
  ent.to = event.params.to;
  ent.value = event.params.value;

  save(ent, 'TokenTransfer', event.block.timestamp);

  if (event.params.from !== event.transaction.from) {
    updateAllowance(event.address, event.params.from, event.transaction.from, event.block.timestamp);
  }
}

export function handleApproval(event: Approval): void {
  let ent = new TokenApproval(eventId(event));
  ent.txHash = event.transaction.hash;
  ent.contract = event.address;
  ent.spender = event.params.spender;
  ent.value = event.params.value;
  ent.owner = event.params.owner;

  save(ent, 'TokenApproval', event.block.timestamp);

  updateAllowance(event.address, event.params.owner, event.params.spender, event.block.timestamp);
}

export function updateAllowance(contract: Bytes, owner: Bytes, spender: Bytes, timestamp: BigInt): void {
  let id = crypto.keccak256(concat(concat(contract, owner), spender)).toHex();
  let allowance = store.get('Allowance', id) as Allowance;

  let token = DAOToken.bind(contract as Address);
  let allowanceAmount = token.allowance(owner as Address, spender as Address);

  if (allowanceAmount.isZero()) {
    store.remove('Allowance', id);
    return;
  }

  if (allowance == null) {
    allowance = new Allowance(id);
    allowance.token = contract;
    allowance.owner = owner;
    allowance.spender = spender;
  }
  allowance.amount = allowanceAmount;

  save(allowance, 'Allowance', timestamp);
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  updateTokenContract(event.address, null, event.block.timestamp);
}

function updateTokenContract(contract: Address , tokenHolder: string, timestamp: BigInt): void {
  let token = DAOToken.bind(contract);
  let tokenContract = TokenContract.load(contract.toHex());
  if (tokenContract == null) {
    tokenContract = new TokenContract(contract.toHex());
    // tslint:disable-next-line: ban-types
    tokenContract.tokenHolders = new Array<string>();
  }
  if (tokenHolder != null) {
      let tokenHolders = tokenContract.tokenHolders;
      let i = tokenHolders.indexOf(tokenHolder);
      if (i == -1) {
          tokenHolders.push(tokenHolder);
      }
      tokenContract.tokenHolders = tokenHolders;
  }
  tokenContract.address = contract;
  tokenContract.totalSupply = token.totalSupply();
  tokenContract.owner = token.owner();
  save(tokenContract as TokenContract, 'TokenContract', timestamp);
}
