# DAOstack subgraph

DAOstack subgraph for [TheGraph](https://thegraph.com/) project.

## Getting started

1 `git clone https://github.com/daostack/subgraph.git && cd subgraph`

2. `npm install`
3. `npm run configure:<development|mainnet>` - configure the project to use ganache or mainnet (requires `.env`
   [configuration](#configuration)) via infura.
4. `npm run codegen` - automatically generate abi and AssemblyScript type definitions required by the project.

All npm scripts can be called within a container using `docker-compose` with all dependencies and services set up:

`npm run docker <command>`

## Commands

1. `configure:mainnet` - configure the project to run against mainnet.
2. `configure:development` - configure the project to run against ganache.
3. `migrate:development` - migrate contracts to ganache and update project configuration.
4. `codegen` - automatically generate abi & type definitions for required contracts.
5. `test` - run integration test.
6. `deploy` - deploy subgraph.
7. `deploy:watch` - redeploy on file change.

Docker commands (requires installing [`docker`](https://docs.docker.com/v17.12/install/) and
[`docker-compose`](https://docs.docker.com/compose/install/)):

1. `docker <command>` - start a command running inside the docker container. Example: `npm run docker test` (run
   intergation tests).
2. `docker:stop` - stop all running docker services.
3. `docker:rebuild <command>` - rebuild the docker container after changes to `package.json`.
4. `docker:logs <subgraph|graph-node|ganache|ipfs|postgres>` - display logs from a running docker service.

## Exposed endpoints

After running a command with docker-compose, the following endpoints will be exposed on your local machine:

- `http://localhost:8000/by-name/daostack` - GraphiQL graphical user interface.
- `http://localhost:8000/by-name/daostack/graphql` - GraphQL api endpoint.
- `http://localhost:8001/by-name/daostack` - graph-node's websockets endpoint
- `http://localhost:8020` - graph-node's RPC endpoint
- `http://localhost:5001` - ipfs endpoint.
- (if using development) `http://localhost:8545` - ganache RPC endpoint.
- `http://localhost:5432` - postgresql connection endpoint.

## Configuration

This project automatically generates `.yaml` files used by `docker-compose` & `graph-node` based on configuration.
Project configuration lives under: `ops/config.yaml` (public configration), `.env` (secret configuration).

The following `.env` variables can be configured:

- `daostack_mainnet__postgresPassword` - postgres password when running on mainnet (e.g `123`).
- `daostack_mainnet__ethereumProvider` - mainnet web3 provider (e.g `https://mainnet.infura.io/v3/<api key>`)

## Add a new contract tracker

In order to add support for a new contract follow these steps:

1. Create a new directory `src/mappings/<contract name>/`
2. Create 4 files:

   1. `src/mappings/<contract name>/mapping.ts` - mapping code.
   2. `src/mappings/<contract name>/schema.graphql` - GraphQL schema for that contract.
   3. `src/mappings/<contract name>/datasource.yaml` - a yaml fragment with:
   4. `abis` - optional - list of contract names that are required by the mapping.
   5. [`entities`](https://github.com/graphprotocol/graph-node/blob/master/docs/subgraph-manifest.md#1521-ethereum-events-mapping) -
      list of entities that are written by the the mapping.
   6. [`eventHandlers`](https://github.com/graphprotocol/graph-node/blob/master/docs/subgraph-manifest.md#1522-eventhandler) -
      map of solidity event signatures to event handlers in mapping code.
   7. `test/integration/<contract name>.spec.ts`

3. (Optionally) add a deployment step for your contract in `ops/migrate.js` that will run before testing.
