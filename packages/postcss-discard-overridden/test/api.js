import { test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';
import { processCSSFactory } from '../../../util/testHelpers.js';

const { processCSS } = processCSSFactory(plugin);

test(
  'should handle empty root and whitespace-only CSS without errors',
  processCSS('   \n  ', '   \n  ')
);

test('should handle root without nodes', () => {
  const root = postcss.root();
  delete root.nodes;
  plugin().OnceExit(root);
});
