import assert from 'node:assert/strict';
import { test } from 'node:test';

// The counter must hook the tokenizer before the registry loads it.
const { counter } = await import('../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { LayerRegistry } =
  await import('../../src/plugins/postcss-merge-idents/lib/layerRegistry.js');
const { createRunContext } = await import('../../src/passes/ir/runContext.js');
const { runDriver } = await import('../../src/passes/ir/runDriver.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

/**
 * The records of a stylesheet, and a registry over them.
 *
 * @param {string} css
 */
function recordsOf(css) {
  const context = createRunContext();
  const state = runDriver.build(postcss.parse(css), context);
  const registry = new LayerRegistry(state.records, context.tokenLists);
  return { records: state.records, registry };
}

test('should give a layer block whose name ends in an escaped space the priority of the layer its hex escape names', () => {
  const { records, registry } = recordsOf(
    '@layer a\\20 {x{}}@layer a\\  {y{}}'
  );
  const { links, root } = records;
  const first = links.firstChild(root.index);
  const second = links.nextSibling(first);
  assert.deepEqual(
    registry.getPriority(links.firstChild(second)),
    registry.getPriority(links.firstChild(first))
  );
});

test('should read the name of a layer block with an escaped space once for all the definitions inside it', () => {
  const { records, registry } = recordsOf('@layer a\\  {x{}y{}z{}}');
  const { links } = records;
  const layer = links.firstChild(records.root.index);
  const before = tokenizeTotal();
  for (
    let rule = links.firstChild(layer);
    rule !== -1;
    rule = links.nextSibling(rule)
  ) {
    registry.getPriority(rule);
  }
  assert.equal(tokenizeTotal() - before, 1);
});
