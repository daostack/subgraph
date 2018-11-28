const fs = require('fs');
const path = require('path');

/**
 * Fetch all abis from @daostack/arc into the `abis` folder.
 */
async function generateAbis() {
	const base = './node_modules/@daostack/arc/build/contracts';
	if (!fs.existsSync('./abis/')) {
		fs.mkdirSync('./abis/');
	}
	const files = fs.readdirSync(base);
	files.forEach(file => {
		const abi = JSON.parse(fs.readFileSync(path.join(base, file), 'utf-8')).abi;
		fs.writeFileSync(path.join('./abis/', file), JSON.stringify(abi, undefined, 2), 'utf-8');
	});
}

if (require.main == module) {
	generateAbis();
} else {
	module.exports = generateAbis;
}
