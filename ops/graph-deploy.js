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
  result = await runGraphCli([
    'create',
    '--access-token ""',
    '--node http://127.0.0.1:8020/',
    'daostack'
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

  result = await runGraphCli([
    'deploy',
    '--access-token ""',
    // '--ipfs /ip4/127.0.0.1/tcp/5001',
    '--ipfs http://127.0.0.1:5001',
    '--node http://127.0.0.1:8020/',
    'daostack',
    subgraphLocation
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
