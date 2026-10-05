import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { tokenize, TokenType } from '@csstools/css-tokenizer';
import plugin from '../src/index.js';

function assertStringValueInvariant(input, output) {
  const inTokens = tokenize({ css: input }).filter(
    ([type]) => type === TokenType.String
  );
  const outTokens = tokenize({ css: output }).filter(
    ([type]) => type === TokenType.String
  );
  assert.equal(outTokens.length, inTokens.length);
  for (let i = 0; i < inTokens.length; i++) {
    assert.equal(outTokens[i][4].value, inTokens[i][4].value);
  }
}

test('should preserve string values for every short sequence of escape-relevant fragments', async () => {
  // Fragments that meet at hex-escape, line-continuation and quote boundaries.
  const fragments = [
    '\\31',
    '\\000031',
    '\\\n',
    '\\\r\n',
    "\\'",
    '\\"',
    '\\\\',
    "'",
    '"',
    '1',
    'g',
    ' ',
    '\t',
    '\n',
    '\r\n',
    '\f',
  ];
  const inputs = [];
  let level = [''];
  for (let depth = 0; depth < 4; depth++) {
    level = level.flatMap((prefix) => fragments.map((f) => prefix + f));
    for (const inner of level) {
      for (const quote of ['"', "'"]) {
        const value = quote + inner + quote;
        const tokens = tokenize({ css: value });
        if (tokens.length === 2 && tokens[0][0] === TokenType.String) {
          inputs.push(value);
        }
      }
    }
  }
  for (const preferredQuote of ['double', 'single']) {
    const decls = inputs.map((value) =>
      postcss.decl({ prop: 'content', value })
    );
    await postcss([plugin({ preferredQuote })]).process(
      postcss.root({ nodes: decls }),
      { from: undefined }
    );
    for (let i = 0; i < inputs.length; i++) {
      assertStringValueInvariant(inputs[i], decls[i].value);
    }
  }
});
