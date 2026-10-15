import { test } from 'node:test';
import { processCSSWithPresetFactory } from '../../../util/integrationTestHelpers.js';
import preset from '../src/index.js';

const { passthroughCSS } = processCSSWithPresetFactory(preset);

// Removing prefixes depends on the browsers a site supports; run autoprefixer
// before cssnano to make that choice explicitly.
test(
  'advanced preset keeps outdated vendor prefixes',
  passthroughCSS('h1{-webkit-box-sizing:content-box;box-sizing:content-box}')
);
