const fs = require('fs')
const yaml = require('js-yaml')
const { migrationFileLocation, network } = require('./settings')
//const mappings = require('./mappings.json')[network].mappings
const daodir = "./daos/";

function daoYaml (contract,contractAddress) {
  const { abis, entities, eventHandlers } = yaml.safeLoad(fs.readFileSync('src/mappings/' + contract + '/datasource.yaml', 'utf-8'))
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
        file: `src/mappings/${contract}/mapping.ts`,
        entities,
        abis: (abis || [contract]).map(contract => ({ name: contract, file: `./abis/${contract}.json` })),
        eventHandlers
     }
   }
}
/**
 * Generate a `subgraph.yaml` file from `datasource.yaml` fragments in
  `mappings` directory `mappings.json` and migration.json`
 */
async function generateSubgraph () {
  fs.readdir(daodir, function (err, files) {
    if (err) {
      console.error("Could not list the directory.", err);
      process.exit(1)
    }
    const subgraphYaml = yaml.safeLoad(fs.readFileSync('subgraph.yaml', 'utf8'));
    files.forEach(function (file, index) {
      const dao = JSON.parse(fs.readFileSync(daodir+file, 'utf-8'));
      subgraphYaml.dataSources[subgraphYaml.dataSources.length] = daoYaml("Reputation",dao.Reputation);
      subgraphYaml.dataSources[subgraphYaml.dataSources.length] = daoYaml("DAOToken",dao.DAOToken);
      subgraphYaml.dataSources[subgraphYaml.dataSources.length] = daoYaml("Avatar",dao.Avatar);
      if (dao.Controller != undefined) {
          subgraphYaml.dataSources[subgraphYaml.dataSources.length] = daoYaml("Controller",dao.Controller);
      }
    })
    fs.writeFileSync('subgraph.yaml', yaml.safeDump(subgraphYaml, { noRefs: true }), 'utf-8')
  })
}

if (require.main === module) {
  generateSubgraph().catch((err) => { console.log(err); process.exit(1) })
} else {
  module.exports = generateSubgraph
}
