const fs = require("fs");
const path = require("path")
const yaml = require("js-yaml");
let { migrationFileLocation: defaultMigrationFileLocation,
network ,startBlock} = require("./settings");
if (network === "poa-sokol") {
  network = "sokol"
} 
const { forEachTemplate } = require("./utils");
const mappings = require("./mappings.json")[network].mappings;
const { subgraphLocation: defaultSubgraphLocation } = require('./graph-cli')

/**
 * Generate a `subgraph.yaml` file from `datasource.yaml` fragments in
 * `mappings` directory `mappings.json` and `migration.json`
 */
async function generateSubgraph(opts={}) {
  // Get the addresses of our predeployed contracts
  const migrationFile = opts.migrationFileLocation || defaultMigrationFileLocation;
  opts.subgraphLocation = opts.subgraphLocation || defaultSubgraphLocation;
  const addresses = JSON.parse(fs.readFileSync(migrationFile, "utf-8"));
  const missingAddresses = {};

  // Build our subgraph's datasources from the mapping fragments
  const dataSources = combineFragments(
    mappings, false, addresses, missingAddresses
  ).filter(el => el != null);

  // Throw an error if there are contracts that're missing an address
  // and are never used as a template
  const missing = Object.keys(missingAddresses).map(function(key) {
    return missingAddresses[key] ? key : null
  }).filter(el => el != null);

  if (missing.length) {
    throw Error(`The following contracts are missing addresses: ${missing.toString()}`);
  }

  const templates = buildTemplates();

  const subgraph = {
    specVersion: "0.0.1",
    schema: { file: "./schema.graphql" },
    dataSources,
    templates
  };

  fs.writeFileSync(
    opts.subgraphLocation,
    yaml.safeDump(subgraph, { noRefs: true }),
    "utf-8"
  );
}

function combineFragments(fragments, isTemplate, addresses, missingAddresses) {
  let ids = [];
  return fragments.map(mapping => {
    const contract = mapping.name;
    const version = mapping.arcVersion;
    const fragment = `${__dirname}/../src/mappings/${mapping.mapping}/datasource.yaml`;
    var abis, entities, eventHandlers, file, yamlLoad, abi;

    if (fs.existsSync(fragment)) {
      yamlLoad = yaml.safeLoad(fs.readFileSync(fragment, "utf-8"));
      file = `${__dirname}/../src/mappings/${mapping.mapping}/mapping.ts`;
      eventHandlers = yamlLoad.eventHandlers;
      entities = yamlLoad.entities;
      abis = (yamlLoad.abis || [contract]).map(contractName => {
        let correctedVersion = version;
        if(contractName == 'TokenTrade' && parseInt(version.slice(-1)[0]) <= 3) {
          correctedVersion = correctedVersion.substring(0, correctedVersion.length -1) + 4
        }
        return {
          name: contractName,
          file: `${__dirname}/../abis/${correctedVersion}/${contractName}.json`
        };
      });
      abi = yamlLoad.abis && yamlLoad.abis.length ? yamlLoad.abis[0] : contract;
    } else {
      file = path.resolve(`${__dirname}/emptymapping.ts`);
      eventHandlers = [{ event: "Dummy()",handler: "handleDummy" }];
      entities = ["nothing"];
      abis = [{ name: contract, file: path.resolve(`${__dirname}/dummyabi.json`) }];
      abi = contract;
    }

    var contractAddress;
    if (isTemplate === false) {
      if (mapping.dao === 'address') {
        contractAddress = mapping.address;
      } else if (mapping.dao === 'organs') {
        contractAddress = addresses[network].test[version][mapping.dao][mapping.contractName];
      } else {
        contractAddress = addresses[network][mapping.dao][version][mapping.contractName];
      }

      // If the contract isn't predeployed
      if (!contractAddress) {
        // Keep track of contracts that're missing addresses.
        // These contracts should have addresses because they're not
        // templated contracts aren't used as templates
        const daoContract = `${network}-${version}-${mapping.contractName}-${mapping.dao}`;
        if (missingAddresses[daoContract] === undefined) {
          missingAddresses[daoContract] = true;
        }
        return null;
      }
    }

    const source = isTemplate ? {
      abi
    } : {
      address: contractAddress,
      abi,
      startBlock
    };

    let name = contract;
    if (ids.indexOf(contract) == -1) {
      ids.push(contract);
    } else if (ids.indexOf(contract+contractAddress) == -1) {
      ids.push(contract+contractAddress);
      name = contract+contractAddress;
    } else {
      return;
    }

    if (isTemplate) {
      // convert name to be version specific
      const classVersion = version.replace(/\.|-/g, '_');
      name = `${name}_${classVersion}`
    }

    var result = {
      kind: 'ethereum/contract',
      name: `${name}`,
      network: `${network === "sokol" ? "poa-sokol" : network}`,
      source,
      mapping: {
        kind: "ethereum/events",
        apiVersion: "0.0.1",
        language: "wasm/assemblyscript",
        file: path.resolve(file),
        entities: entities ? entities : ["nothing"],
        abis,
        eventHandlers
      }
    };

    return result;
  });
}

function buildTemplates() {
  let results = [];

  forEachTemplate((name, mapping, arcVersion) => {
    results.push(
      ...combineFragments(
        [{
          name,
          mapping,
          arcVersion
        }],
        true,
        undefined,
        undefined
      )
    );
  });

  return results;
}

if (require.main === module) {
  generateSubgraph().catch(err => {
    console.log(err);
    process.exit(1);
  });
} else {
  module.exports = generateSubgraph;
}
