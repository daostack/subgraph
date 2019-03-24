const fs = require('fs')
const yaml = require('js-yaml')
const { migrationFileLocation, network } = require('./settings')
const mappings = require('./mappings.json')[network].mappings

/**
 * Generate a `subgraph.yaml` file from `datasource.yaml` fragments in
  `mappings` directory `mappings.json` and migration.json`
 */
async function generateSubgraph () {
  let indexesAddresses = []

  const migrationFile = migrationFileLocation

  const addresses = JSON.parse(fs.readFileSync(migrationFile, 'utf-8'))

  const dataSources = mappings.map(mapping => {
    var contract = mapping.name
    const { abis, entities, eventHandlers } = yaml.safeLoad(fs.readFileSync('src/mappings/' + mapping.mapping + '/datasource.yaml', 'utf-8'))

    const contractAddress = addresses[network][mapping.dao][mapping.contractName]

    if (!contractAddress) {
      throw Error(`Address for contract ${contract} of ${mapping.dao} not found in ${migrationFile}`)
    }

    indexesAddresses.push(contractAddress)

    return {
      kind: 'ethereum/contract',
      name: `${contract}`,
      network: `${network}`,
      source: {
        address: contractAddress,
        abi: abis && abis.length ? abis[0] : contract
      },
      mapping: {
        kind: 'ethereum/events',
        apiVersion: '0.0.1',
        language: 'wasm/assemblyscript',
        file: `src/mappings/${mapping.mapping}/mapping.ts`,
        entities,
        abis: (abis || [contract]).map(contract => ({ name: contract, file: `./abis/${contract}.json` })),

        eventHandlers
      }
    }
  })

  const subgraph = {
    specVersion: '0.0.1',
    schema: { file: './schema.graphql' },
    dataSources
  }

  let indexedArrayStirng = 'import { Address } from \'@graphprotocol/graph-ts\';\n\nexport let addresses: Address[] = [\n'
  for (i in indexesAddresses) {
    indexedArrayStirng += "    Address.fromString('" + indexesAddresses[i] + "')" +',\n'
  }

  indexedArrayStirng += '  ];\n'
  fs.writeFileSync('src/addresses.ts', indexedArrayStirng, 'utf-8')

  fs.writeFileSync('subgraph.yaml', yaml.safeDump(subgraph, { noRefs: true }), 'utf-8')
}

if (require.main === module) {
  generateSubgraph().catch((err) => { console.log(err); process.exit(1) })
} else {
  module.exports = generateSubgraph
}
