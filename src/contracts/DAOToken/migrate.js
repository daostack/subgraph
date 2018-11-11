const DAOToken = require('@daostack/arc/build/contracts/DAOToken.json');

async function migrate(web3, opts) {
    const Token = new web3.eth.Contract(DAOToken.abi, undefined, opts);
    const token = await Token.deploy({
        data: DAOToken.bytecode,
        arguments: ["TEST", "TST", 1000000000]
    }).send();
    return [
        token.options.address
    ];
}

module.exports = migrate;