
describe('sanity', () => {

  it('Sanity', async () => {
   // validate ops/mappings.json include latest arc on private network.
    const mappings = require(`../ops/mappings.json`);
    let latestArcVersionExist = false;
    for (let i = 0; i < mappings.private.mappings.length; i++) {
        if (mappings.private.mappings[i].arcVersion === '0.0.1-rc.30') {
          latestArcVersionExist = true;
        }
    }
    expect(latestArcVersionExist).toEqual(true);
  }, 100);
});
