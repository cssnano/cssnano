import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS } = processCSSFactory(plugin);

/* U+212A KELVIN SIGN lowercases to ASCII k under Unicode case folding, but CSS
 * matches property names ASCII-case-insensitively, so it names no property. */
const kelvin = 'K';

test(
  'keeps padding longhands before an unknown property spelled with a Kelvin sign, because browsers ignore that declaration',
  passthroughCSS(
    `a{padding-block-start:1px;padding-block-end:1px;padding-bloc${kelvin}:2px}`
  )
);

test(
  'keeps a margin-block shorthand followed by an unknown property spelled with a Kelvin sign, because that declaration does not override margin-block-end',
  passthroughCSS(`a{margin-block:1px 2px;margin-bloc${kelvin}-end:1px}`)
);
