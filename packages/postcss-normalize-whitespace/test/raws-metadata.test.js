import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const staleRawPlugin = {
  postcssPlugin: 'stale-raw',
  Declaration(decl) {
    decl.value = 'new value';
  },
};
const processor = postcss([plugin()]);

test(
  'should prefer a declaration value over stale raw metadata',
  processCSSFactory([staleRawPlugin, plugin]).processCSS(
    'a{color:old /* inline comment */}',
    'a{color:new value /* inline comment */}'
  )
);

test('should synchronize decl.raws.value when normalized', async () => {
  const input = 'a{width:  10px  }';
  const root = postcss.parse(input);
  const decl = root.first.first;
  decl.raws.value = { raw: '  10px  ', value: '10px' };
  await processor.process(root, { from: undefined });
  assert.deepEqual(decl.raws.value, { raw: '10px', value: '10px' });
});

// Boundary trim must not depend on internal whitespace being present.
test('should trim boundary-only whitespace in raws.value', async () => {
  const root = postcss.parse('a{width:10px}');
  const decl = root.first.first;
  decl.raws.value = { raw: ' 10px ', value: '10px' };
  await processor.process(root, { from: undefined });
  assert.deepEqual(decl.raws.value, { raw: '10px', value: '10px' });
});
