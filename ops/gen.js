require("dotenv").config();
process.env = {
  ethereum: "http://127.0.0.1:8545",
  test_mnemonic:
    "behave pipe turkey animal voyage dial relief menu blush match jeans general",
  ...process.env
};
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const ora = require('ora');
const Web3 = require("web3");
const HDWallet = require("hdwallet-accounts");

async function generateABIs() {
    const spinner = ora();
    const base = "./node_modules/@daostack/arc/build/contracts";
    if (!fs.existsSync("./abis/")) {
        fs.mkdirSync("./abis/");
    }
    const files = fs.readdirSync(base);
    files.forEach(file => {
        const abi = JSON.parse(fs.readFileSync(path.join(base, file), "utf-8")).abi;
        fs.writeFileSync(
        path.join("./abis/", file),
        JSON.stringify(abi, undefined, 2),
        "utf-8"
        );
    });
    spinner.succeed('Wrote files to `./abis/`')
}

async function generateSubgraph(all) {
    const spinner = ora();
    const dataSources = all.map(({addresses, dataSource, contract, mappingPath}) => 
        addresses.map(address => ({
            kind: 'ethereum/contract',
            name: contract,
            source: {
                address,
                abi: contract
            },
            mapping: {
                kind: 'ethereum/events',
                apiVersion: '0.0.1',
                language: 'wasm/assemblyscript',
                file: mappingPath,
                abis: [{
                    name: contract,
                    file: `./abis/${contract}.json`,
                }],
                ...dataSource    
            }
        }))
    );
    const subgraph = {
        specVersion: '0.0.1',
        schema: { 
            file: './schema.graphql'
        },
        dataSources: dataSources.reduce((acc, arr) => [...acc, ...arr], []) // flatten
    }
    fs.writeFileSync('./subgraph.yaml', yaml.safeDump(subgraph), 'utf-8');
    spinner.succeed(`Wrote file 'subgraph.yaml'.`);
}

async function generateSchema(all) {
    const spinner = ora();
    const schema = all.map(({schema, contract}) => `# START ${contract}\n${schema}\n# END ${contract}`).join('\n\n');
    fs.writeFileSync('./schema.graphql', schema, 'utf-8')
    spinner.succeed(`Wrote file 'schema.graphql'.`);
}

async function generateConfigFile(all) {
    const spinner = ora();
    const addresses = all.reduce((acc, {addresses, contract}) => ({...acc, [contract]: addresses}), {});
    fs.writeFileSync('./config.json', JSON.stringify(addresses, undefined, 2), 'utf-8')
    spinner.succeed(`Wrote file 'config.json'.`);
}

async function getWeb3() {
    const { ethereum, test_mnemonic } = process.env;
    const web3 = new Web3(ethereum);
    const hdwallet = HDWallet(10, test_mnemonic);
    Array(10)
        .fill(10)
        .map((_, i) => i)
        .forEach(i => {
        const pk = hdwallet.accounts[i].privateKey;
        const account = web3.eth.accounts.privateKeyToAccount(pk);
        web3.eth.accounts.wallet.add(account);
        });
    web3.eth.defaultAccount = web3.eth.accounts.wallet[0].address;

    return web3;
}

async function gen() {
    const indir = './src/contracts';
    const spinner = ora();
    try {    
        const contracts = fs.readdirSync(indir);
        spinner.info(`Found ${contracts.length} contract/s.`);

        const web3 = await getWeb3();
        const opts = {
            from: web3.eth.defaultAccount,
            gas: (await web3.eth.getBlock("latest")).gasLimit - 100000
        };
        const all = [];
        for(let i in contracts) {
            const contract = contracts[i];
            spinner.start(`Packaging '${contract}'...`);
            const dir = path.join(indir, contract);
            const dataSource = yaml.safeLoad(fs.readFileSync(path.join(dir, 'datasource.yaml'), 'utf-8'));
            const schema = fs.readFileSync(path.join(dir, 'schema.graphql'), 'utf-8');
            const migrate = require(path.join(path.relative(__dirname, indir), contract, 'migrate.js'));
            spinner.start(`Migrating '${contract}'...`);
            addresses = await migrate(web3, opts);
            spinner.info(`${contract} -> ${JSON.stringify(addresses.length > 1 ? addresses : addresses[0], undefined, 2)}.`);
            all.push({
                addresses,
                dataSource,
                schema,
                contract,
                mappingPath: path.join(dir, 'mapping.ts')
            })
        }
        
        await generateSubgraph(all);
        await generateSchema(all);
        await generateConfigFile(all);
        await generateABIs();
    } catch(e) {
        spinner.fail(`Failed to package contracts: ${e.message}`);
        throw e;
    }
}

if(require.main = module) {
    gen().catch(e => process.exit(1));
} else {
    module.exports = {
        gen
    }
}