const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');
const { migrationFileLocation } = require('./settings');
const  mappings  = require('./mappings.json').mappings;

/**
 * Generate a `subgraph.yaml` file from `datasource.yaml` fragments in `mappings` directory and `migration.json`
 */
async function generateSubgraph(daos,contractsNames) {
	const migrationFile = migrationFileLocation;

	const addresses = JSON.parse(fs.readFileSync(migrationFile, 'utf-8'));

	const dataSources = mappings.map(mapping => {
		var contract = mapping.name
		const { abis, entities, eventHandlers } = yaml.safeLoad(fs.readFileSync('src/mappings/'+mapping.mapping+'/datasource.yaml', 'utf-8'));

		const contractAddress = addresses.private[mapping.dao][contract];

		if (!contractAddress) {
			throw Error(`Address for contract ${contract} of ${mapping.dao} not found in ${migrationFile}`);
		}
		return {
			kind: 'ethereum/contract',
			name: `${contract}`,
			source: {
				address: contractAddress,
				abi: abis && abis.length ? abis[0] :contract,
			},
			mapping: {
				kind: 'ethereum/events',
				apiVersion: '0.0.1',
				language: 'wasm/assemblyscript',
				file: `src/mappings/${mapping.mapping}/mapping.ts`,
				entities,
				abis: (abis || [contract]).map(contract => ({ name: contract, file: `./abis/${contract}.json` })),

				eventHandlers,
			},
		};
	});

	const subgraph = {
		specVersion: '0.0.1',
		schema: { file: './schema.graphql' },
		dataSources
	};
	fs.writeFileSync('subgraph.yaml', yaml.safeDump(subgraph, { noRefs: true }), 'utf-8');
}

if (require.main === module) {
	generateSubgraph().catch((err)  => { console.log(err); process.exit(1) });
} else {
	module.exports = generateSubgraph;
}
