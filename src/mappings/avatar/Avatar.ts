import "allocator/arena";
export { allocate_memory };

import { EthereumEvent, Address, store, BigInt } from "@graphprotocol/graph-ts";

// Import event types from the Token contract ABI
import { Avatar } from "../../types/Avatar/Avatar";

// Import entity types generated from the GraphQL schema
import { AvatarContract } from "../../types/schema";

export function handleAvatarBalance(event: EthereumEvent): void {
  let avatarSC = Avatar.bind(event.address);

  let avatar = store.get("Avatar", event.address.toHex()) as AvatarContract;
  if (avatar == null) {
    avatar = new AvatarContract();
    avatar.id = event.address.toHex();
    avatar.address = event.address;
    avatar.name = avatarSC.orgName();
    avatar.nativeReputation = avatarSC.nativeReputation().toString();
    avatar.nativeToken = avatarSC.nativeToken();
    avatar.owner = avatarSC.owner();
  }

  avatar.balance = getEtherBalance(event.address);

  store.set("Avatar", event.address.toHex(), avatar);
}

function getEtherBalance(address: Address): BigInt {
  return 1 as BigInt;
}
