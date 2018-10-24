# DAOstack subgraph

The DAOstack caching layer built on top of [TheGraph](https://thegraph.com/)

# Get started

## Configure the project

### .env variables

Secret variables can be configured in a `.env` file with the following variables:

- `daostack_mainnet__postgresPassword` (e.g `123`)
- `daostack_mainnet__ethereumProvider` (e.g `https://mainnet.infura.io/v3/<infura key>`)

Non-secret variables:

- `ethereum` - (default: `http://127.0.0.1:8545`) - ethereum rpc provider.
- `test_mnemonic` - (default: `behave pipe turkey animal voyage dial relief menu blush match jeans general`) - mnemonic used for test account generation.
- `node_http`: - (default: `http://127.0.0.1:8000/`) - graph-node http endpoint.
- `node_ws`: - (default: `http://127.0.0.1:8001/`) - graph-node websockets endpoint.
- `node_rpc`: - (default: `http://127.0.0.1:8020/`) - graph-node rpc endpoint.
- `ipfs_host`: - (default: `127.0.0.1`) - ipfs host.
- `ipfs_port`: - (default: `5001`) - ipfs port.

### Configurations

1. `npm run configure:mainnet` - Use mainnet contract addresses and infura (requires `.env` configuration)
2. `npm run configure:development` - Use ganache as ethereum provider.
3. `npm run migrate:development` - Deploy required contracts to ganache and update contract addresses.

## Run locally

1. Using docker-compose: `docker-compose run -v $(pwd):/usr/app -v /usr/app/node_modules subgraph <command>`
2. Without docker:
   1. `ipfs daemon`
   2. (if using `development` configuration): `ganache-cli --deterministic --gasLimit 8000000 --mnemonic "behave pipe turkey animal voyage dial relief menu blush match jeans general"`
   3. Make sure [`postgres`](https://www.postgresql.org/) is running on port `5432`
   4. Start [`graph-node`](https://github.com/graphprotocol/graph-node#running-a-local-graph-node)
   5. `npm install`
   6. `npm run codegen`
   7. `npm run <command>`

### Commands

- `test` - run integration tests.
- `deploy` - deploy the subgraph
- `deploy:watch` - deploy the subgraph on file change.
- `codegen` - generate ABI definitions (in `abis`) and typescript type definitions (in `src/types`)
- `configure:<mainnet|development>` - Configure the project to target a chain.
- `migrate:development` - Deploy required contracts to local
