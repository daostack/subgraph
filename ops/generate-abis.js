const fs = require("fs-extra");

/**
 * Fetch all abis from @daostack/migration into the `abis` folder.
 */
async function generateAbis() {
  fs.copySync("node_modules/@daostack/migration/abis", `${__dirname}/../abis`);
}

if (require.main === module) {
  generateAbis().catch(err => {
    console.log(err);
    process.exit(1);
  });
} else {
  module.exports = generateAbis;
}
