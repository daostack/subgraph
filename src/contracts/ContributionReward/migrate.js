const ContributionReward = require("@daostack/arc/build/contracts/ContributionReward.json");

async function migrate(web3, opts) {
  const CR = new web3.eth.Contract(ContributionReward.abi, undefined, opts);
  const cr = await CR.deploy({
    data: ContributionReward.bytecode,
    arguments: []
  }).send();
  return [cr.options.address];
}

module.exports = migrate;
