import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import {
  discardOverriddenPlugins,
  processCSSFactory,
} from '../../../../util/testHelpers.js';

const { processCSS } = processCSSFactory(discardOverriddenPlugins());

test(
  'should handle empty root and whitespace-only CSS without errors',
  processCSS('   \n  ', '   \n  ')
);

test('should handle root without nodes', () => {
  const root = postcss.root();
  delete root.nodes;
  // Only the walk runs here; stringifying a root without nodes is not part of the transform.
  const result = postcss(discardOverriddenPlugins()).process(root, {
    from: undefined,
  });
  assert.equal(result.root, root);
});
