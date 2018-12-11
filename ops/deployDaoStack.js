const path = require('path');
const DAOstackMigration = require('@daostack/migration');
const { migrationFileLocation } = require('./settings');

async function deployDaoStack (options) {
  let provider;
  if (process.env.ethereum) {
    provider = process.env.ethereum;
  } else {
    provider = 'http://localhost:8545';
  }
  options = {
    // web3 provider url
    provider,
    quiet: true,
    // disable confirmation messages
    force: true,
    // filepath to output the migration results
    output: path.resolve(migrationFileLocation),
    // private key of the account used in migration (overrides the 'mnemonic' option)
    // privateKey: '0x8d4408014d165ec69d8cc9f091d8f4578ac5564f376f21887e98a6d33a6e3549',
    // mnemonic used to generate the private key of the account used in migration
    // mnemonic: myth like bonus scare over problem client lizard pioneer submit female collect
    // migration parameters
    // params: {
    // 	default: {
    // 		// migration params as defined in the "Migration parameters" section below
    // 	},
    // 	private: {
    // 		// overide defaults on private network
    // 	},
    // 	kovan: {
    // 		// overide defaults on kovan
    // 	},
    // }
    ...options
  };

  // migrate both base and an example DAO
  console.log(options);
  const migrationResult = await DAOstackMigration.migrate(options); // migrate
  console.log(migrationResult);
  return { options, migrationResult };
}

if (require.main === module) {
  deployDaoStack();
} else {
  module.exports = {
    deployDaoStack
  };
}
