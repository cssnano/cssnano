import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { hostPlugin } from '../../src/pipeline/host.js';
import calc from '../../src/plugins/postcss-calc/index.js';
import orderedValues from '../../src/plugins/postcss-ordered-values/index.js';

test('should order a border whose calc() an earlier stage in the same host reduced', async () => {
  const processor = postcss([
    hostPlugin([
      { entry: calc, options: { unwrapSingleValue: true }, targets: false },
      { entry: orderedValues, options: {}, targets: false },
    ]),
  ]);
  const result = await processor.process(
    'a{border:solid calc(1px + 1px) red}',
    { from: undefined }
  );
  assert.equal(result.css, 'a{border:2px solid red}');
});
