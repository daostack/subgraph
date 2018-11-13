#!/bin/bash

set -e

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

targets="GenesisProtocol DaoCreator UController Reputation ContributionReward"

if [[ -n "$1" ]]
then network_id="$1"
else network_id=4447
fi 

if [[ -n "$2" ]]
then ipfs="$2"
else ipfs="/dns4/ipfs/tcp/5001"
fi

if [[ "$network_id" == "1" ]]
then env=prod
else env=dev
fi

artifacts=../contracts/build/contracts
mkdir -p ${artifacts%/*} build/abis build/types build/$network_id

if [[ ! -d "$artifacts" ]]
then cp -r node_modules/@daostack/arc.js/migrated_contracts $artifacts
fi

cp src/subgraph.yaml build/subgraph.$env.yaml

for target in $targets;
do
  echo "Processing $target..."
  cat $artifacts/$target.json | jq '.abi' > ./build/abis/$target.json
  address="`cat $artifacts/$target.json | jq '.networks["'$network_id'"].address' | tr -d '"'`"
  sed -i 's/{{'"$target"'Address}}/'"$address"'/' build/subgraph.$env.yaml
done

graph=../node_modules/.bin/graph
cp -r src/mappings src/schema.graphql src/*.ts build/
ln -s `pwd`/node_modules build/node_modules

########################################
cd build

graph=../node_modules/.bin/graph

echo -n "Generating types..."
$graph codegen --output-dir types subgraph.$env.yaml

wait_for "`echo $ipfs | awk -F '/' '{print $3}'`"
echo "Compiling subgraph..."

# for more info re following witchcraft: https://stackoverflow.com/a/41943779
exec 5>&1
output="`$graph build --ipfs=$ipfs --output-dir=$env-dist subgraph.$env.yaml | tee /dev/fd/5; exit ${PIPESTATUS[0]}`"
subgraph="`echo $output | egrep -o "Subgraph: [a-zA-Z0-9]+" | sed 's/Subgraph: //'`"

curl -s ipfs:8080/ipfs/$subgraph > $network_id/subgraph.yaml

echo "$subgraph subgraph.yaml contains ipfs links:"
for link in `curl -s ipfs:8080/ipfs/$subgraph | grep "/ipfs/" | sed 's/ \/: //' | tr -d " "`
do
  echo " - $link"
  curl -s ipfs:8080$link > $network_id/${link##*/}
done

rm node_modules
