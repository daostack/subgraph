import { getWeb3, getContractAddresses, getOptions, query } from "./util";

const Reputation = require('@daostack/arc/build/contracts/Reputation.json');

describe('Reputation', () => {
    let web3, addresses, reputation;
    beforeAll(async () => {
        web3 = await getWeb3();
        addresses = getContractAddresses();
        const opts = await getOptions(web3);
        reputation = new web3.eth.Contract(Reputation.abi, addresses.Reputation, opts);
    });

    async function checkTotalSupply(value) {
        const { reputationContracts } = await query(`{
      reputationContracts {
        address,
        totalSupply
      }
    }`);
        expect(reputationContracts.length).toEqual(1);
        expect(reputationContracts).toContainEqual({
            address: reputation.options.address.toLowerCase(),
            totalSupply: value
        })
    }

    it('Sanity', async () => {
        expect(1).toEqual(1);
    }, 100000)
})
