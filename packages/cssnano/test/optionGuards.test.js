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

test('isPluginEntries accepts an entry whose first element is a stage entry with a create function', () => {
  const entry = { create: () => null };
  const settings = { postcssPlugin: 'x', optionKeys: [] };
  assert.equal(isPluginEntries([[entry, 'x', settings]]), true);
});

test('isPluginEntries rejects an entry whose first element is neither a creator nor a stage entry', () => {
  const settings = { postcssPlugin: 'x', optionKeys: [] };
  assert.equal(isPluginEntries([[{ run() {} }, 'x', settings]]), false);
});
