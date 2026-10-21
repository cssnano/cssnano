import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPluginEntries } from '../src/optionGuards.js';

const creator = () => ({ postcssPlugin: 'x' });

test('isPluginEntries accepts an entry whose transforms declare option keys', () => {
  const settings = {
    postcssPlugin: 'x',
    transforms: [{ name: 'a', optionKeys: [] }],
  };
  assert.equal(isPluginEntries([[creator, 'x', settings]]), true);
});

test('isPluginEntries rejects an entry with an empty transforms list, which would never run', () => {
  const settings = { postcssPlugin: 'x', transforms: [] };
  assert.equal(isPluginEntries([[creator, 'x', settings]]), false);
});

test('isPluginEntries rejects malformed transforms even when optionKeys is valid', () => {
  const settings = { postcssPlugin: 'x', optionKeys: [], transforms: [{}] };
  assert.equal(isPluginEntries([[creator, 'x', settings]]), false);
});
