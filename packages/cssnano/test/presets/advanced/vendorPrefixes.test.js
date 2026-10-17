import { test } from 'node:test';
import preset from '../../../src/presets/advanced.js';
import { processCSSFactory } from '../../../../../util/testHelpers.js';

const { passthroughCSS } = processCSSFactory(preset());

// Removing prefixes depends on the browsers a site supports; run autoprefixer
// before cssnano to make that choice explicitly.
test(
  'advanced preset keeps outdated vendor prefixes',
  passthroughCSS('h1{-webkit-box-sizing:content-box;box-sizing:content-box}')
);
