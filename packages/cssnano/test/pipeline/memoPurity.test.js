import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import colormin from '../../src/plugins/postcss-colormin/index.js';
import normalizeTimingFunctions from '../../src/plugins/postcss-normalize-timing-functions/index.js';
import { declarationTraversal } from '../../src/pipeline/traversal.js';

const stages = [colormin, normalizeTimingFunctions].map((descriptor) =>
  /** @type {() => import('../../src/pipeline/host.js').ValueStage} */ (
    descriptor.compile({}, Object.freeze(['chrome 120']))
  )()
);

// Repeated values exercise memo hits, and the unchanged ones exercise misses
// that fold to the input.
const css = `
a{color:#ff0000;background:#ff0000 url(a.png);transition:opacity 1s cubic-bezier(0.25,0.1,0.25,1)}
b{color:#ff0000;border-color:rgb(0,0,0);transition:opacity 1s cubic-bezier(0.25,0.1,0.25,1)}
c{color:red;--x:#ff0000;animation:x 1s steps(1,start)}
@media print{d{color:#ff0000;animation:x 1s steps(1,start)}}
`;

/** @param {{memoise: boolean}} options */
async function fold(options) {
  const plugin = {
    postcssPlugin: 'fold',
    OnceExit(/** @type {import('postcss').Root} */ root) {
      declarationTraversal(stages, options).run(root);
    },
  };
  return (await postcss([plugin]).process(css, { from: undefined })).css;
}

describe('the value plan memo', () => {
  test('gives the output of a run with no memo, so it only saves work', async () => {
    assert.equal(await fold({ memoise: true }), await fold({ memoise: false }));
  });

  test('changes the colors and timing functions that the stages reduce', async () => {
    const output = await fold({ memoise: true });
    assert.match(output, /color:red;background:red url\(a\.png\)/v);
    assert.match(output, /transition:opacity 1s ease/v);
  });
});

/** @param {boolean} memoise */
async function foldsOfSharedValue(memoise) {
  let folds = 0;
  const counting = {
    forProperty: () => () => {
      folds += 1;
    },
  };
  const plugin = {
    postcssPlugin: 'fold',
    OnceExit(/** @type {import('postcss').Root} */ root) {
      declarationTraversal([counting], { memoise }).run(root);
    },
  };
  await postcss([plugin]).process('a{color:red}b{color:red}', {
    from: undefined,
  });
  return folds;
}

describe('declarationTraversal without the memo', () => {
  test('folds a value that two declarations share once for each declaration', async () => {
    assert.equal(await foldsOfSharedValue(false), 2);
  });

  test('folds a value that two declarations share only once by default', async () => {
    assert.equal(await foldsOfSharedValue(true), 1);
  });
});
