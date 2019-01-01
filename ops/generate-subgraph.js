const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');
const { migrationFileLocation } = require('./settings');

/**
 * Generate a `subgraph.yaml` file from `datasource.yaml` fragments in `mappings` directory and `migration.json`
 */
async function generateSubgraph(daos,contractsNames) {
	const migrationFile = path.resolve(`${__dirname}/../migration_1.json`);
	const addresses = JSON.parse(fs.readFileSync(migrationFile, 'utf-8'));

	const files = await new Promise((res, rej) =>
		glob('src/mappings/**/datasource.yaml', (err, files) => (err ? rej(err) : res(files)))
	);


	const dataSources = files.map(file => {
		console.log(file);
		const contract = path.basename(path.dirname(file));
		const { abis, entities, eventHandlers } = yaml.safeLoad(fs.readFileSync(file, 'utf-8'));

		const contractAddress = addresses.private.base[contract] || addresses.private.dao[contract];

		if (!contractAddress) {
			throw Error(`Address for contract ${contract} not found in ${migrationFile}`);
		}
		return {
			kind: 'ethereum/contract',
			name: `${contract}`,
			source: {
				address: contractAddress,
				abi: abis && abis.length ? abis[0] : contract,
			},
			mapping: {
				kind: 'ethereum/events',
				apiVersion: '0.0.1',
				language: 'wasm/assemblyscript',
				file: path.join(path.dirname(file), 'mapping.ts'),
				entities,
				abis: (abis || [contract]).map(contract => ({ name: contract, file: `./abis/${contract}.json` })),
				eventHandlers,
			},
		};
	});

	const dataSourcesDAOs = daos.map(dao => {
		var res = [];
		for (var i = 0; i < contractsNames.length; i++) {
		var ContractName = contractsNames[i]
		const { abis, entities, eventHandlers } = yaml.safeLoad(fs.readFileSync('src/mappings/'+ContractName+'/datasource.yaml', 'utf-8'));
		const contractAddress = addresses.private[dao][ContractName];

		if (!contractAddress) {
			throw Error(`Address for contract ${ContractName} not found in ${migrationFile}`);
		}
		res.push( {
			kind: 'ethereum/contract',
			name: ContractName,
			source: {
				address: contractAddress,
				abi: abis && abis.length ? abis[0] : ContractName,
			},
			mapping: {
				kind: 'ethereum/events',
				apiVersion: '0.0.1',
				language: 'wasm/assemblyscript',
				file: `src/mappings/${ContractName}/mapping.ts`,
				entities,
				abis: (abis || [ContractName]).map(ContractName => ({ name: ContractName, file: `./abis/${ContractName}.json` })),
				eventHandlers,
			},
		});
	}
	return res;
	});

	const subgraph = {
		specVersion: '0.0.1',
		schema: { file: './schema.graphql' },
		dataSources,
		dataSourcesDAOs
	};

	console.log(dataSourcesDAOs)

	fs.writeFileSync('subgraph.yaml', yaml.safeDump(subgraph, { noRefs: true }), 'utf-8');
  //this is "not nice" patch :)
	// var data = fs.readFileSync('subgraph.yaml', 'utf-8');
  // var ip = "dataSourcesDAOs:";
  // var newValue = data.replace(ip, '');
	// newValue = newValue.replace("- -", '-');
  // fs.writeFileSync('subgraph.yaml', newValue, 'utf-8');
}

if (require.main === module) {
	generateSubgraph().catch((err)  => { console.log(err); process.exit(1) });
} else {
	module.exports = generateSubgraph;
}
