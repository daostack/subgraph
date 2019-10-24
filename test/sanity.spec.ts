
describe('sanity', () => {

  it('Sanity', async () => {
   //validate mapping include latest arc on private network.
    const mappings = require(`../ops/mappings.json`);
    let versionExist = false;
    for (let i = 0; i < mappings.private.mappings.length; i++) {
        if (mappings.private.mappings[i].arcVersion === '0.0.1-rc.30') {
          versionExist = true;
        }
    }
    expect(versionExist).toEqual(true);
  }, 100);
});
