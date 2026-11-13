import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import cssnano from '../../src/index.js';
import preset from '../../src/presets/default.js';

/**
 * Runs the default preset and returns the output and the messages it pushed.
 * @param {string} css
 */
async function runDefault(css) {
  const result = await postcss([cssnano({ preset })]).process(css, {
    from: undefined,
  });
  return {
    css: result.css,
    messages: result.messages.map((message) => [
      message.type,
      message.plugin,
      message.node?.toString(),
    ]),
  };
}

describe('a nested @charset that empties its container, under the default preset', () => {
  test('the emptied @media is discarded, the walk reaches the next rule, and one removal is reported', async () => {
    const { css, messages } = await runDefault(
      '@media x{@charset "a";}b{color:red}'
    );
    assert.equal(css, 'b{color:red}');
    assert.deepEqual(messages, [
      ['removal', 'postcss-discard-empty', '@media x{}'],
    ]);
  });
});
