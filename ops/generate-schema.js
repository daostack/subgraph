const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Merge all schemas (files with `.graphql` extension) from `mappings` into a single schema
 */
async function generateSchema() {
	const files = await new Promise((res, rej) =>
		glob('src/mappings/**/schema.graphql', (err, files) => (err ? rej(err) : res(files)))
	);
	const schema = [...files, 'src/domain/schema.graphql']
		.map(file => {
			const name = path.basename(path.dirname(file));
			const content = fs.readFileSync(file, 'utf-8');
			return `# START ${name}\n${content}\n# END ${name}`;
		})
		.join('\n\n');

	fs.writeFileSync('schema.graphql', schema, 'utf-8');
}

if ((require.main == module)) {
	generateSchema();
} else {
	module.exports = generateSchema;
}
