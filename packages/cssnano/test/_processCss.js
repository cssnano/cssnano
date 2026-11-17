import assert from 'node:assert/strict';
import postcss from 'postcss';
import cssnano from '../src/index.js';
import { testTargets } from '../../../util/testHelpers.js';

const processor = postcss([cssnano({ browserslist: { query: testTargets } })]);

function processCss(fixture, expected, options) {
  return async () => {
    const { css } = await processor.process(fixture, {
      from: undefined,
      ...options,
    });
    assert.strictEqual(css, expected);
  };
}
processCss.passthrough = function (fixture, options) {
  return processCss(fixture, fixture, options);
};

export default processCss;
