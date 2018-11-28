import { Address, store } from '@graphprotocol/graph-ts';
import { DAOToken } from '../types/DAOToken/DAOToken';
import { TokenContract } from '../types/schema';

export function getToken(id: string): TokenContract {
  let token = store.get('TokenContract', id) as TokenContract;
  if (token == null) {
    token = new TokenContract();
    token.id = id;
  }

  return token;
}

export function saveToken(token: TokenContract): void {
  store.set('TokenContract', token.id, token);
}

export function insertToken(tokenAddress: Address, daoId: string): void {
  let tok = DAOToken.bind(tokenAddress);
  let token = getToken(tokenAddress.toHex());
  token.dao = daoId;
  token.name = tok.name();
  token.symbol = tok.symbol();
  token.totalSupply = tok.totalSupply();
  saveToken(token);
}

export function updateTokenTotalSupply(tokenAddress: Address): void {
  let tok = DAOToken.bind(tokenAddress);
  let token = getToken(tokenAddress.toHex());
  token.totalSupply = tok.totalSupply();
  saveToken(token);
}
