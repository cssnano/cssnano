import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import {
  normalizeWhitespacePlugins,
  processCSSFactory,
} from '../../../../util/testHelpers.js';

const staleRawPlugin = {
  postcssPlugin: 'stale-raw',
  Declaration(decl) {
    decl.value = 'new value';
  },
};
const processor = postcss(normalizeWhitespacePlugins());

test(
  'should prefer a declaration value over stale raw metadata',
  processCSSFactory([
    staleRawPlugin,
    ...normalizeWhitespacePlugins(),
  ]).processCSS(
    'a{color:old /* inline comment */}',
    'a{color:new value /* inline comment */}'
  )
);

test('should print the normalized value when decl.raws.value was stale', async () => {
  const input = 'a{width:  10px  }';
  const root = postcss.parse(input);
  const decl = root.first.first;
  decl.raws.value = { raw: '  10px  ', value: '10px' };
  await processor.process(root, { from: undefined });
  assert.equal(root.toString(), 'a{width:10px}');
});

// Boundary trim must not depend on internal whitespace being present.
test('should print the trimmed value when decl.raws.value holds boundary-only whitespace', async () => {
  const root = postcss.parse('a{width:10px}');
  const decl = root.first.first;
  decl.raws.value = { raw: ' 10px ', value: '10px' };
  await processor.process(root, { from: undefined });
  assert.equal(root.toString(), 'a{width:10px}');
});
