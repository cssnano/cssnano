import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPluginEntries } from '../src/optionGuards.js';

const creator = () => ({ postcssPlugin: 'x' });

test('isPluginEntries accepts an entry whose optionKeys is a list of strings', () => {
  const settings = { postcssPlugin: 'x', optionKeys: ['level'] };
  assert.equal(isPluginEntries([[creator, 'x', settings]]), true);
});

test('isPluginEntries rejects an entry whose optionKeys is not a list of strings', () => {
  const settings = { postcssPlugin: 'x', optionKeys: [1] };
  assert.equal(isPluginEntries([[creator, 'x', settings]]), false);
});
