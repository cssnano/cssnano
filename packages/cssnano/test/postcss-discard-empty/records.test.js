import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import discardEmptyPlugin from '../../src/plugins/postcss-discard-empty/index.js';

/**
 * Runs the discardEmpty plugin alone over `css`.
 *
 * @param {string} css
 * @return {Promise<import('postcss').Result>}
 */
function runPlugin(css) {
  return postcss([discardEmptyPlugin()]).process(css, { from: undefined });
}

describe('discardEmpty removals', () => {
  test('the stylesheet keeps the leading whitespace of the removed first child for the child after it', async () => {
    const result = await runPlugin('\n\n\ta{}\n  b{color:red}');
    assert.equal(result.css, '\n\n\tb{color:red}');
  });

  test('a removal of a nested at-rule reports a node with no parent and no children', async () => {
    const result = await runPlugin('@media x{a{}}');
    const atRule = result.messages[1].node;
    assert.equal(atRule.type, 'atrule');
    assert.equal(atRule.parent, undefined);
    assert.equal(atRule.nodes.length, 0);
  });

  test('a removal reports the removed rules in the order they were removed', async () => {
    const result = await runPlugin('a{}b{}c{color:red}');
    assert.deepEqual(
      result.messages.map((message) => message.node.selector),
      ['a', 'b']
    );
  });
});
