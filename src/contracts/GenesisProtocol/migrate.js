const DAOToken = require('@daostack/arc/build/contracts/DAOToken.json');
const GenesisProtocol = require('@daostack/arc/build/contracts/GenesisProtocol.json');

async function migrate(web3, opts) {
    const Token = new web3.eth.Contract(DAOToken.abi, undefined, opts);
    const token = await Token.deploy({
        data: DAOToken.bytecode,
        arguments: ["TEST", "TST", 1000000000]
    }).send();

    const GP = new web3.eth.Contract(GenesisProtocol.abi, undefined, opts);
    const gp = await GP.deploy({
        data: GenesisProtocol.bytecode,
        arguments: [token.options.address]
    }).send();
    return [
        gp.options.address
    ];
}

module.exports = migrate;