import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { IN_KEYFRAMES, hasContextBit } from '../../src/pipeline/context.js';
import { hostPlugin } from '../../src/pipeline/host.js';
import { tokens } from '../../src/utils/value.js';

/**
 * Rewrites the whole text of a buffer, as one token edit.
 * @param {import('../../src/values/valueBuffer.js').ValueBuffer} buffer
 * @param {string} text
 */
function setText(buffer, text) {
  buffer.replace(0, buffer.tokens().length, tokens(text));
}

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
      selector: (buffer) => setText(buffer, buffer.text().toUpperCase()),
    }).process('a{color:red}', { from: undefined });
    assert.equal(result.css, 'A{color:red}');
  });

  test('should rewrite an at-rule prelude through the forAtRule buffer part', async () => {
    const result = await hostWith({
      forAtRule: () => ({
        buffer: (buffer) => setText(buffer, buffer.text().toUpperCase()),
      }),
    }).process('@media screen{a{color:red}}', { from: undefined });
    assert.equal(result.css, '@media SCREEN{a{color:red}}');
  });

  test('should leave @charset as it is, since no stage plans its prelude', async () => {
    const result = await hostWith({
      forAtRule: () => ({
        buffer: (buffer) => setText(buffer, buffer.text().toUpperCase()),
      }),
    }).process('@charset "utf-8";a{color:red}', { from: undefined });
    assert.equal(result.css, '@charset "utf-8";a{color:red}');
  });

  test('should pass a selector in keyframes the keyframes context', async () => {
    const result = await hostWith({
      selector: (buffer, context) => {
        if (hasContextBit(context, IN_KEYFRAMES)) setText(buffer, 'K');
      },
    }).process('@keyframes x{from{opacity:0}}a{color:red}', {
      from: undefined,
    });
    assert.equal(result.css, '@keyframes x{K{opacity:0}}a{color:red}');
  });

  test('should give a prelude to a stage as written, comments included, while its raw is fresh', async () => {
    const result = await hostWith({
      forAtRule: () => ({
        buffer: (buffer) => setText(buffer, `[${buffer.text()}]`),
      }),
    }).process('@media screen /* c */ and tv{a{color:red}}', {
      from: undefined,
    });
    assert.equal(result.css, '@media [screen /* c */ and tv]{a{color:red}}');
  });

  test('should give a prelude to a stage from params when an earlier plugin left its raw stale', async () => {
    const result = await postcss([
      {
        postcssPlugin: 'rewrite-params',
        AtRule(atRule) {
          atRule.params = 'print';
        },
      },
      ...hostWith({
        forAtRule: () => ({
          buffer: (buffer) => setText(buffer, `[${buffer.text()}]`),
        }),
      }).plugins,
    ]).process('@media screen /* c */ and tv{a{color:red}}', {
      from: undefined,
    });
    assert.equal(result.css, '@media [print]{a{color:red}}');
  });
});
