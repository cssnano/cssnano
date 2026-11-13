import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import cssnano from '../../src/index.js';
import defaultPreset from '#presets/default';

test('a removal of a nested at-rule reports a node with no parent and no children', async () => {
  // Pins what the removal messages hold today: the second removal is the at-rule, already detached.
  const result = await postcss([cssnano({ preset: defaultPreset })]).process(
    '@media x{a{}}',
    { from: undefined }
  );
  const [rule, atRule] = result.messages;
  assert.equal(result.messages.length, 2);
  assert.equal(rule.type, 'removal');
  assert.equal(atRule.node.type, 'atrule');
  assert.equal(atRule.node.name, 'media');
  assert.equal(atRule.node.parent, undefined);
  assert.equal(atRule.node.nodes.length, 0);
});
