const path = require('path');
const deployDaoStack = require('./deployDaoStack').deployDaoStack;
const subgraphRepo = path.resolve(`${__dirname}/..`);

async function setupenv () {
  // const provider = 'http://ganach:8545';
  console.log(`Deploying Daostack contracts`);
  let { options, migrationResult } = await deployDaoStack();
  console.log(`Deployed Daostack contracts, information written to ${options.output}`);

  console.log(`Generating ABI files`);
  // node ops/generate-abis.js && node ops/generate-schema.js && node ops/generate-subgraph.js
  await require(`${subgraphRepo}/ops/generate-abis`)();

  console.log(`Generating schemas`);
  await require(`${subgraphRepo}/ops/generate-schema`)();

  console.log(`Generating subgraph`);
  await require(`${subgraphRepo}/ops/generate-subgraph`)();

  const cwd = subgraphRepo;
  console.log('Calling graph codegen');
  await require(`${subgraphRepo}/ops/graph-codegen`)(cwd);

  console.log('Deploying subgraph configuration');
  await require(`${subgraphRepo}/ops/graph-deploy`)();

  console.log('Deploy Success');
  // deploymentResult[0] is the status code
  // but it is not very helpful, because it returns 0 also on some errors
  // console.log(deploymentResult[0])
}


if (require.main === module) {
  setupenv();
} else {
  module.exports = setupenv;
}
