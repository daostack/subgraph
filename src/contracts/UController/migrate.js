const UController = require('@daostack/arc/build/contracts/UController.json');

async function migrate(web3, opts) {
    const UC = new web3.eth.Contract(UController.abi, undefined, opts);
    const uc = await UC.deploy({
        data: UController.bytecode,
        arguments: []
    }).send();
    return [
        uc.options.address
    ];
}

module.exports = migrate;