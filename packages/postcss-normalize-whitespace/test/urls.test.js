import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { tokenize, TokenType } from '@csstools/css-tokenizer';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS } = processCSSFactory(plugin);
const processor = postcss([plugin()]);

test(
  'should preserve whitespace in unquoted URLs',
  passthroughCSS('a{background:url( assets/a.png )}')
);

test(
  'should preserve whitespace in uppercase unquoted URLs',
  passthroughCSS('a{background:URL( assets/a.png )}')
);

test(
  'should preserve escaped whitespace in unquoted URLs',
  passthroughCSS('a{background:url( a\\ b.png )}')
);

for (const [name, whitespace, expectedValue] of [
  ['space', ' ', 'foo '],
  ['tab', '\t', 'foo\t'],
]) {
  test(`should preserve escaped URL-boundary ${name}`, async () => {
    const input = `a{x:url(foo\\${whitespace})}`;
    const result = await processor.process(input, { from: undefined });

    assert.equal(result.css, input);
    const reparsed = postcss.parse(result.css);
    const token = [...tokenize({ css: reparsed.first.first.value })].find(
      (candidate) => candidate[0] === TokenType.URL
    );

    assert.equal(token?.[4].value, expectedValue);
  });
}
