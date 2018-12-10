const { runGraphCli, subgraphLocation } = require('./graph-cli.js');


async function deploy(cwd) {
  const result = await runGraphCli([
    'deploy',
    '--access-token ""',
    '--ipfs ${ipfs-/ip4/127.0.0.1/tcp/5001}',
    '--node ${node_rpc-http://127.0.0.1:8020/}',
    '-n daostack',
    subgraphLocation
  ], cwd);
  if (result[0] === 1) {
    throw Error(`Deployment failed! ${result[1]}`);
  }
  return result;
}


if (require.main === module) {
	deploy();
} else {
	module.exports = deploy;
}
