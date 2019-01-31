const path = require('path')
const { runGraphCli, subgraphLocation } = require('./graph-cli.js')

async function deploy (cwd) {
  if (cwd === undefined) {
    cwd = path.resolve(`${__dirname}/..`)
  }
  console.log(`using ${cwd} and ${subgraphLocation}`)
  /* eslint no-template-curly-in-string: "off" */
  let result
  let msg
  /* create the subgraph */
  console.log(`removing subgraph "daostack" if it exists`)
  result = await runGraphCli([
    'remove',
    'daostack',
    '--node http://127.0.0.1:8020/',
    '--access-token ""',
  ], cwd)
  msg = result[1] + result[2]
  if (result[0] === 1) {
    throw Error(`Create failed! ${msg}`)
  }
  if (msg.toLowerCase().indexOf('error') > 0) {
    if (msg.match(/subgraph name not found/)) {
      // if the graph does not exist,  we are fine and we pass on to the next step
    } else {
      throw Error(`Create failed! ${msg}`)
    }
  }


  /* create the subgraph */
  console.log(`creating subgraph "daostack" `)
  result = await runGraphCli([
    'create',
    'daostack',
    '--access-token ""',
    '--node http://127.0.0.1:8020/',
  ], cwd)
  msg = result[1] + result[2]
  if (result[0] === 1) {
    throw Error(`Create failed! ${msg}`)
  }
  if (msg.toLowerCase().indexOf('error') > 0) {
    if (msg.match(/subgraph already exists/)) {
      // the subgraph was already created before -we're ok
    } else {
      throw Error(`Create failed! ${msg}`)
    }
  }

  console.log(`deploying ${subgraphLocation} to subgraph "daostack"`)
  result = await runGraphCli([
    'deploy',
    'daostack',
    subgraphLocation,
    '--access-token ""',
    // '--ipfs /ip4/127.0.0.1/tcp/5001',
    '--ipfs http://127.0.0.1:5001',
    '--node http://127.0.0.1:8020/',
  ], cwd)
  msg = result[1] + result[2]
  if (result[0] === 1) {
    throw Error(`Deployment failed! ${msg}`)
  }
  if (msg.toLowerCase().indexOf('error') > 0) {
    throw Error(`Deployment failed! ${msg}`)
  }
  return result
}

if (require.main === module) {
  deploy().catch((err) => { console.log(err); process.exit(1) })
} else {
  module.exports = deploy
}
