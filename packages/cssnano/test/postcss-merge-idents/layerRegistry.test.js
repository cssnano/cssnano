import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { LayerRegistry } from '../../src/plugins/postcss-merge-idents/lib/layerRegistry.js';
import { TextTable } from '../../src/values/textTable.js';

test('should give a layer block whose name ends in an escaped space the priority of the layer its hex escape names', () => {
  const root = postcss.parse('@layer a\\20 {x{}}@layer a\\  {y{}}');
  const registry = new LayerRegistry(new TextTable());
  assert.deepEqual(
    registry.getPriority(root.last.first),
    registry.getPriority(root.first.first)
  );
});
