import assert from 'node:assert/strict';
import postcss from 'postcss';
import cssnano from '../src/index.js';

const processor = postcss([cssnano()]);

function processCss(fixture, expected, options = { from: undefined }) {
  return async () => {
    const { css } = await processor.process(fixture, options);
    assert.strictEqual(css, expected);
  };
}
processCss.passthrough = function (fixture, options = { from: undefined }) {
  return processCss(fixture, fixture, options);
};

export default processCss;
