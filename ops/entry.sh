#!/bin/bash

function wait_for {
  target=$1;
  echo "Waiting for $target to wake up..."
  while true
  do
    ping -c1 -w1 $target > /dev/null 2> /dev/null
    sleep 3
    if [[ "$?" == "0" ]]
    then break
    else echo "Waiting for $target to wake up..."
    fi
  done
}

mode=${ethereum%%:*}
if [[ -z "$network_id" ]]
then network_id=4447
fi

echo "network_id=$network_id, mode=$mode, ethereum=$ethereum, ipfs=$ipfs"

wait_for ipfs
wait_for graph_db
[[ "$mode" == "dev" ]] && wait_for ethprovider

subgraph="`curl -sF "file=@build/$network_id/subgraph.yaml" ipfs:5001/api/v0/add | jq .Hash | tr -d '"'`"

if [[ -z "$subgraph" ]]
then exit 1
else echo "subgraph=$subgraph"
fi

for file in build/$network_id/*
do curl -sF "file=@$file" ipfs:5001/api/v0/add
done

exec graph-node \
  --debug \
  --postgres-url "postgresql://$postgres_user:`cat $postgres_pass_file`@$postgres_host/$postgres_db" \
  --ethereum-rpc "$ethereum" \
  --ipfs "$ipfs" \
  --subgraph "$subgraph"
