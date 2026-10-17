import { describe, test } from 'node:test';
import {
  processCSSFactory,
  withTargets,
} from '../../../../util/testHelpers.js';
import plugin from '../../src/plugins/postcss-colormin/index.js';

const { processCSS } = processCSSFactory(plugin);

const input = 'a{color:transparent;background:rgba(0,0,0,0.5)}';
const withoutAlphaHex = 'a{color:transparent;background:rgba(0,0,0,.5)}';
const withAlphaHex = 'a{color:#0000;background:#00000080}';

describe('colormin browser targets', () => {
  for (const query of [
    'ie 8',
    'ie 9',
    'ie 11',
    'edge 15',
    'defaults',
    'op_mini all',
  ]) {
    test(
      `keeps rgba() and transparent for ${query}, which lacks #rrggbbaa`,
      processCSS(input, withoutAlphaHex, withTargets(query))
    );
  }

  for (const query of ['last 1 chrome version', 'safari TP']) {
    test(
      `writes #rrggbbaa for ${query}`,
      processCSS(input, withAlphaHex, withTargets(query))
    );
  }

  test(
    'writes #rrggbbaa when stats select only chrome 150',
    processCSS(
      input,
      withAlphaHex,
      withTargets('> 1%', { stats: { chrome: { 150: 100 } } })
    )
  );
});
