const fs = require('fs')
const path = require('path')

const getDirectories = source =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

/**
 * Fetch all abis from @daostack/migration-experimental into the `abis` folder.
 */
async function generateAbis () {
  getDirectories('./node_modules/@daostack/migration-experimental/contracts/').forEach(arcVersion => {
    if (!fs.existsSync(`${__dirname}/../abis/` + arcVersion)) {
        fs.mkdirSync(`${__dirname}/../abis/` + arcVersion, { recursive: true })
    }

    const files = fs.readdirSync('./node_modules/@daostack/migration-experimental/contracts/' + arcVersion)
    files.forEach(file => {
      const { abi } = JSON.parse(fs.readFileSync(path.join('./node_modules/@daostack/migration-experimental/contracts/' + arcVersion, file), 'utf-8'))
      // Temporary walk-around needed because of a GraphNode issue. https://github.com/graphprotocol/ethabi/pull/12
      if (file === 'Avatar.json' || file === 'Vault.json') {
        abi.pop()
      }
      fs.writeFileSync(
        path.join(`${__dirname}/../abis/` + arcVersion, file),
        JSON.stringify(abi, undefined, 2),
        'utf-8'
      )
    })
  })
}

if (require.main === module) {
  generateAbis().catch(err => {
    console.log(err)
    process.exit(1)
  })
} else {
  module.exports = generateAbis
}
