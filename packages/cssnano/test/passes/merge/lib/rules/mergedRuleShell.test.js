import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { transformPlugin } from '#passes/merge';

const plugin = transformPlugin('mergeRules');

/**
 * @param {string} css
 * @return {Promise<import('postcss').Root>}
 */
function run(css) {
  return postcss([plugin])
    .process(css, { from: undefined })
    .then((result) => result.root);
}

test('a merged rule keeps the source position of the later rule it replaces', async () => {
  const css = 'h1{color:red}\nh2{color:red;text-decoration:underline}';
  const root = await run(css);
  const merged = root.nodes.find((node) => node.selector === 'h1,h2');
  assert.ok(merged, 'the pair merges into h1,h2');
  assert.deepEqual(
    { line: merged.source.start.line, column: merged.source.start.column },
    { line: 2, column: 1 }
  );
});

test('a merged rule holds none of the later rule unclaimed declarations', async () => {
  const root = await run(
    'h1{color:red}h2{color:red;text-decoration:underline;font-weight:bold}'
  );
  const merged = root.nodes.find((node) => node.selector === 'h1,h2');
  assert.deepEqual(
    merged.nodes.map((node) => node.prop),
    ['color']
  );
});
