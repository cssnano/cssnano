import { test } from 'uvu';
import * as assert from 'uvu/assert';
import postcss from 'postcss';
import cssnano from '..';

export default function processCss(
  fixture,
  expected,
  options = { from: undefined }
) {
  return () =>
    postcss([cssnano()])
      .process(fixture, options)
      .then(({ css }) => {
        assert.is(css, expected);
      });
}

export function passthrough(fixture, options = { from: undefined }) {
  return processCss(fixture, fixture, options);
}
test.run();
