import assert from 'node:assert/strict';
import postcss from 'postcss';
import cssnano from '../src/index.js';
import { withRepositoryFile } from '../../../util/testHelpers.js';

const processor = postcss([cssnano()]);

function processCss(fixture, expected, options) {
  return async () => {
    const { css } = await processor.process(
      fixture,
      withRepositoryFile(options)
    );
    assert.strictEqual(css, expected);
  };
}
processCss.passthrough = function (fixture, options) {
  return processCss(fixture, fixture, options);
};

export default processCss;
