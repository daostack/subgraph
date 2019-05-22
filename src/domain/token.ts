import { Address, store } from '@graphprotocol/graph-ts';
import { getDAOTokenName, getDAOTokenSupply, getDAOTokenSymbol } from '../contractsUtils';
import { Token } from '../types/schema';

export function getToken(id: string): Token {
  let token = store.get('Token', id) as Token;
  if (token == null) {
    token = new Token(id);
  }

  return token;
}

export function saveToken(token: Token): void {
  store.set('Token', token.id, token);
}

export function insertToken(tokenAddress: Address, daoId: string): void {
  let token = getToken(tokenAddress.toHex());
  token.dao = daoId;
  token.name = getDAOTokenName(tokenAddress);
  token.symbol = getDAOTokenSymbol(tokenAddress);
  token.totalSupply = getDAOTokenSupply(tokenAddress);
  saveToken(token);
}

export function updateTokenTotalSupply(tokenAddress: Address): void {
  let token = getToken(tokenAddress.toHex());
  token.totalSupply = getDAOTokenSupply(tokenAddress);
  saveToken(token);
}
