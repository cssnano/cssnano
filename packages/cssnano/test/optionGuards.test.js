import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPluginEntries } from '../src/optionGuards.js';

const stage = { create: () => null };
const creator = () => ({ postcssPlugin: 'x' });

test('isPluginEntries accepts an entry whose optionKeys is a list of strings', () => {
  const settings = { optionKeys: ['level'] };
  assert.equal(isPluginEntries([[stage, 'x', settings]]), true);
});

test('isPluginEntries rejects an entry whose optionKeys is not a list of strings', () => {
  const settings = { optionKeys: [1] };
  assert.equal(isPluginEntries([[stage, 'x', settings]]), false);
});

test('isPluginEntries accepts an entry whose first element is a stage entry with a create function', () => {
  const settings = { optionKeys: [] };
  assert.equal(isPluginEntries([[stage, 'x', settings]]), true);
});

test('isPluginEntries rejects a PostCSS plugin creator, which a preset no longer takes as an entry', () => {
  const settings = { optionKeys: [] };
  assert.equal(isPluginEntries([[creator, 'x', settings]]), false);
});

test('isPluginEntries rejects an entry whose first element has no create function', () => {
  const settings = { optionKeys: [] };
  assert.equal(isPluginEntries([[{ run() {} }, 'x', settings]]), false);
});
