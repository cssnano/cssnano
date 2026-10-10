import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import cssnanoUtils from 'cssnano-utils';
import { componentKey } from '../src/lib/shorthandValueGrammar.js';

const { tokens } = cssnanoUtils;

/** @param {string} raw */
function component(raw) {
  return { raw, tokens: tokens(raw) };
}

describe('componentKey case folding', () => {
  test('keeps a Kelvin sign identifier distinct from ASCII k, because CSS keywords match ASCII-case-insensitively', () => {
    assert.notEqual(
      componentKey(component('\\212A')),
      componentKey(component('k'))
    );
  });

  test('keeps a Kelvin sign unit distinct from ASCII k, because CSS units match ASCII-case-insensitively', () => {
    assert.notEqual(
      componentKey(component('1\\212A')),
      componentKey(component('1k'))
    );
  });
});
