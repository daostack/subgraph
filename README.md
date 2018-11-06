# DAOstack subgraph

DAOstack subgraph for [TheGraph](https://thegraph.com/) project.

## Getting started

1. `git clone https://github.com/daostack/subgraph.git && cd subgraph`
2. `npm install`

All npm scripts can be called within a container using `docker-compose` with all dependencies and services set up:

`npm run docker <command>`

## Commands

1. `gen` - automatically generate abis, migrate contracts to ganache, generate config files for graph-node & type definitions for required contracts.
2. `gen:watch` - run `npm run gen` on file change in `src/contracts`
3. `test` - run integration tests.
4. `deploy` - deploy subgraph.
5. `deploy:watch` - redeploy on file change.

Docker commands (requires installing [`docker`](https://docs.docker.com/v17.12/install/) and [`docker-compose`](https://docs.docker.com/compose/install/)): 

1. `docker <command>` - start a command running inside the docker container. Example: `npm run docker test` (run intergation tests).
2. `docker:stop` - stop all running docker services.
3.  `docker:rebuild <command>` - rebuild the docker container after changes to `package.json`.
4.  `docker:logs <subgraph|graph-node|ganache|ipfs|postgres>` - display logs from a running docker service. 

## Exposed endpoints

After running a command with docker-compose, the following endpoints will be exposed on your local machine:

- `http://localhost:8000/by-name/daostack` - GraphiQL graphical user interface.
- `http://localhost:8000/by-name/daostack/graphql` - GraphQL api endpoint.
- `http://localhost:8001/by-name/daostack` - graph-node's websockets endpoint
- `http://localhost:8020` - graph-node's RPC endpoint
- `http://localhost:5001` - ipfs endpoint.
- (if using development) `http://localhost:8545` - ganache RPC endpoint.
- `http://localhost:5432` - postgresql connection endpoint.

## Add a new contract tracker

In order to add support for a new contract:

1. Create a directory `src/contracts/<contract name>` ([example](./src/contracts/Reputation/)), that directory must include:
    1. `datasource.yaml` - a simple yaml config file containing the `entities` and `eventHandlers` subsections of the subgraph definition for that contract as specified [here](https://github.com/graphprotocol/graph-node/blob/master/docs/subgraph-manifest.md#1521-ethereum-events-mapping). ([example](./src/contracts/Reputation/datasource.yaml))
    2. `mapping.ts` - the AssemblyScript mapping file that defines the event handlers specified above. ([example](./src/contracts/Reputation/mapping.ts))
    3. `migrate.js` - A node module that exports an async `migrate` function that migrates the contract to ganache and returns an array of contract addresses. ([example](./src/contracts/Reputation/migrate.ts))
    4. `schema.graphql` - GraphQL schema file defining the entities described in `datasource.yaml`. ([example](./src/contracts/Reputation/schema.graphql.ts))
2. Add tests for the contract at `test/<contract name>.spec.ts`.

*Note: `<contract name>` must be a valid contract name that the [@daostack/arc](https://www.npmjs.com/package/@daostack/arc) package exposes under `build/contracts`.*