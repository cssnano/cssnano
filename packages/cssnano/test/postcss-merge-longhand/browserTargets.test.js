import { describe, test } from 'node:test';
import {
  processCSSFactory,
  withTargets,
} from '../../../../util/testHelpers.js';
import plugin from '../../src/plugins/postcss-merge-longhand/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

const input =
  'a{inset-block-start:0;inset-block-end:0;inset-inline-start:0;inset-inline-end:0}';

describe('merge-longhand browser targets', () => {
  // The inset-block and inset-inline shorthands are missing from these targets.
  for (const query of ['ie 8', 'ie 11', 'edge 15', 'defaults', 'op_mini all']) {
    test(
      `keeps the inset longhands for ${query}, which lacks the logical shorthands`,
      passthroughCSS(input, withTargets(query))
    );
  }

  for (const query of ['last 1 chrome version', 'safari TP']) {
    test(
      `merges the inset longhands into logical shorthands for ${query}`,
      processCSS(input, 'a{inset-block:0;inset-inline:0}', withTargets(query))
    );
  }

  test(
    'merges the inset longhands when stats select only chrome 150',
    processCSS(
      input,
      'a{inset-block:0;inset-inline:0}',
      withTargets('> 1%', { stats: { chrome: { 150: 100 } } })
    )
  );
});
