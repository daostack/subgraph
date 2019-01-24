const path = require('path')
const { runGraphCli, subgraphLocation } = require('./graph-cli.js')

async function deploy (cwd) {
  if (cwd === undefined) {
    cwd = path.resolve(`${__dirname}/..`)
  }
  console.log(`using ${cwd} and ${subgraphLocation}`)
  /* eslint no-template-curly-in-string: "off" */
  await runGraphCli([
    'create',
    '--access-token ""',
    '--node ${node_rpc-http://127.0.0.1:8020/}',
    'daostack'
  ], cwd)

  const result = await runGraphCli([
    'deploy daostack',
    '--access-token ""',
    '--ipfs ${ipfs-/ip4/127.0.0.1/tcp/5001}',
    '--node ${node_rpc-http://127.0.0.1:8020/}',
    subgraphLocation
  ], cwd)
  const msg = result[1]
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