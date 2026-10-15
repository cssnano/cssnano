import { test } from 'node:test';
import { processCSSWithPresetFactory } from '../../../../../util/integrationTestHelpers.js';
import preset from '../../../src/presets/advanced.js';

const { passthroughCSS } = processCSSWithPresetFactory(preset);

// Sorting declarations only helps gzip and risks reordering overrides, so the
// preset leaves the source order alone.
test(
  'advanced preset keeps the source order of declarations',
  passthroughCSS('a{display:flex;align-items:center}')
);
