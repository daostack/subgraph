import { Address, BigInt, store } from '@graphprotocol/graph-ts';
import { DAOToken } from '../types/DAOToken/DAOToken';
import { Token } from '../types/schema';
import { save } from '../utils';

export function getToken(id: string): Token {
  let token = store.get('Token', id) as Token;
  if (token == null) {
    token = new Token(id);
  }

  return token;
}

export function saveToken(token: Token, timestamp: BigInt): void {
  save(token, 'Token', timestamp);
}

export function insertToken(tokenAddress: Address, daoId: string, timestamp: BigInt): void {
  let tok = DAOToken.bind(tokenAddress);
  let token = getToken(tokenAddress.toHex());
  token.dao = daoId;
  token.name = tok.name();
  token.symbol = tok.symbol();
  token.totalSupply = tok.totalSupply();
  saveToken(token, timestamp);
}

export function updateTokenTotalSupply(tokenAddress: Address, timestamp: BigInt): void {
  let tok = DAOToken.bind(tokenAddress);
  let token = getToken(tokenAddress.toHex());
  token.totalSupply = tok.totalSupply();
  saveToken(token, timestamp);
}
