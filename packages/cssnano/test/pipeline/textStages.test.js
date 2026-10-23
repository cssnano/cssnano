import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { IN_KEYFRAMES, hasContextBit } from '../../src/pipeline/context.js';
import { hostPlugin } from '../../src/pipeline/host.js';

/**
 * A host with one stage that rewrites every selector and prelude to upper case.
 * @param {object} parts the stage parts under test
 */
function hostWith(parts) {
  return postcss([
    hostPlugin([
      {
        entry: { create: () => parts },
        options: {},
        targets: false,
      },
    ]),
  ]);
}

describe('text parts of a stage', () => {
  test('should rewrite a selector through the selector part', async () => {
    const result = await hostWith({
      selector: (text) => text.toUpperCase(),
    }).process('a{color:red}', { from: undefined });
    assert.equal(result.css, 'A{color:red}');
  });

  test('should rewrite an at-rule prelude through the forAtRule part', async () => {
    const result = await hostWith({
      forAtRule: () => (text) => text.toUpperCase(),
    }).process('@media screen{a{color:red}}', { from: undefined });
    assert.equal(result.css, '@media SCREEN{a{color:red}}');
  });

  test('should leave @charset as it is, since no stage plans its prelude', async () => {
    const result = await hostWith({
      forAtRule: () => (text) => text.toUpperCase(),
    }).process('@charset "utf-8";a{color:red}', { from: undefined });
    assert.equal(result.css, '@charset "utf-8";a{color:red}');
  });

  test('should pass a selector in keyframes the keyframes context', async () => {
    const result = await hostWith({
      selector: (text, context) =>
        hasContextBit(context, IN_KEYFRAMES) ? 'K' : text,
    }).process('@keyframes x{from{opacity:0}}a{color:red}', {
      from: undefined,
    });
    assert.equal(result.css, '@keyframes x{K{opacity:0}}a{color:red}');
  });
});
