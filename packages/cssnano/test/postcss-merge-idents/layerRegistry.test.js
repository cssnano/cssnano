import assert from 'node:assert/strict';
import { test } from 'node:test';

// The counter must hook the tokenizer before the registry loads it.
const { counter } = await import('../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { LayerRegistry } =
  await import('../../src/plugins/postcss-merge-idents/lib/layerRegistry.js');
const { TextTable } = await import('../../src/values/textTable.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

test('should give a layer block whose name ends in an escaped space the priority of the layer its hex escape names', () => {
  const root = postcss.parse('@layer a\\20 {x{}}@layer a\\  {y{}}');
  const registry = new LayerRegistry(new TextTable());
  assert.deepEqual(
    registry.getPriority(root.last.first),
    registry.getPriority(root.first.first)
  );
});

test('should read the name of a layer block with an escaped space once for all the definitions inside it', () => {
  const root = postcss.parse('@layer a\\  {x{}y{}z{}}');
  const registry = new LayerRegistry(new TextTable());
  const before = tokenizeTotal();
  for (const rule of root.first.nodes) {
    registry.getPriority(rule);
  }
  assert.equal(tokenizeTotal() - before, 1);
});
