const Reputation = require('@daostack/arc/build/contracts/Reputation.json');

async function migrate(web3, opts) {
    const Rep = new web3.eth.Contract(Reputation.abi, undefined, opts);
    const rep = await Rep.deploy({
        data: Reputation.bytecode,
        arguments: []
    }).send();
    return [
        rep.options.address
    ];
}

module.exports = migrate;