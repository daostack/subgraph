const fs = require("fs");
const yaml = require("js-yaml");
const { migrationFileLocation, network } = require("./settings");
const mappings = require("./mappings.json")[network].mappings;

/**
 * Generate a `subgraph.yaml` file from `datasource.yaml` fragments in
 * `mappings` directory `mappings.json` and `migration.json`
 */
async function generateSubgraph() {
  // Get the addresses of our predeployed contracts
  const migrationFile = migrationFileLocation;
  const addresses = JSON.parse(fs.readFileSync(migrationFile, "utf-8"));
  const missingAddresses = {};

  // Build our subgraph's datasources from the mapping fragments
  const dataSources = combineFragments(
    mappings, false, addresses, missingAddresses
  ).filter(el => el != null);

  // Throw an error if there are contracts that're missing an address
  // and are never used as a template
  const missing = Object.keys(missingAddresses).map(function(key, index) {
    return missingAddresses[key] ? key : null
  }).filter(el => el != null);

  if (missing.length) {
    throw Error(`The following contracts are missing addresses: ${missing.toString()}`);
  }

  const subgraph = {
    specVersion: "0.0.1",
    schema: { file: "./schema.graphql" },
    dataSources
  };

  fs.writeFileSync(
    "subgraph.yaml",
    yaml.safeDump(subgraph, { noRefs: true }),
    "utf-8"
  );
}

function combineFragments(fragments, isTemplate, addresses, missingAddresses) {
  return fragments.map(mapping => {
    const contract = mapping.name;
    const fragment = `src/mappings/${mapping.mapping}/datasource.yaml`;
    var abis, entities, eventHandlers, templates, file, yamlLoad, abi;

    if (fs.existsSync(fragment)) {
      yamlLoad = yaml.safeLoad(fs.readFileSync(fragment));
      file = `src/mappings/${mapping.mapping}/mapping.ts`;
      eventHandlers = yamlLoad.eventHandlers;
      entities = yamlLoad.entities;
      templates = yamlLoad.templates;
      abis = (yamlLoad.abis || [contract]).map(contract => ({
        name: contract,
        file: `./abis/${contract}.json`
      }));
      abi = yamlLoad.abis && yamlLoad.abis.length ? yamlLoad.abis [0] : contract;
    } else {
      file = "ops/emptymapping.ts";
      eventHandlers = [{ event: "Dummy()",handler: "handleDummy" }];
      entities = ["nothing"];
      abis = [{ name: contract, file: `./ops/dummyabi.json` }];
      abi = contract;
    }

    var contractAddress;
    if (isTemplate === false) {
      if (mapping.dao === 'organs') {
        contractAddress = addresses[network].test[mapping.arcVersion][mapping.dao][mapping.contractName];
      } else {
        contractAddress = addresses[network][mapping.dao][mapping.arcVersion][mapping.contractName];
      }

      // If the contract isn't predeployed
      if (!contractAddress) {
        // Keep track of contracts that're missing addresses.
        // These contracts should have addresses because they're not
        // templated contracts aren't used as templates
        const daoContract = `${network}-${mapping.arcVersion}-${mapping.contractName}-${mapping.dao}`;
        if (missingAddresses[daoContract] === undefined) {
          missingAddresses[daoContract] = true;
        }
        return null;
      }
    }

    const sourceAbi = abis && abis.length ? abis[0].name : contract;
    const source = isTemplate ? {
      abi: sourceAbi
    } : {
      address: contractAddress,
      abi: sourceAbi
    };

    var result = {
      kind: 'ethereum/contract',
      name: `${contract}`,
      network: `${network}`,
      source,
      mapping: {
        kind: "ethereum/events",
        apiVersion: "0.0.1",
        language: "wasm/assemblyscript",
        file: file,
        entities,
        abis,
        eventHandlers
      }
    }

    if (templates && templates.length) {
      result.templates = combineFragments(
        templates.map(template => ({ name: template, mapping: template })),
        true, addresses, missingAddresses
      )
    }

    return result
  });
}

if (require.main === module) {
  generateSubgraph().catch(err => {
    console.log(err);
    process.exit(1);
  });
} else {
  module.exports = generateSubgraph;
}
