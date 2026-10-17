import { test } from 'node:test';
import preset from '../../../src/presets/advanced.js';
import { processCSSFactory } from '../../../../../util/testHelpers.js';

const { passthroughCSS } = processCSSFactory(preset());

// Sorting declarations only helps gzip and risks reordering overrides, so the
// preset leaves the source order alone.
test(
  'advanced preset keeps the source order of declarations',
  passthroughCSS('a{display:flex;align-items:center}')
);
