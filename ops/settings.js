const path = require('path')
require('dotenv').config();

const migrationFileLocation = path.resolve(`${__dirname}/../migration.json`)
const network = process.env.network || 'private'
const graphNode = process.env.graph_node || 'http://127.0.0.1:8020/'
const ipfsNode = process.env.ipfs_node || 'http://127.0.0.1:5001'
const subgraphName = process.env.subgraph || 'daostack'

module.exports = {
  migrationFileLocation,
  network,
  graphNode,
  ipfsNode,
  subgraphName,
}
