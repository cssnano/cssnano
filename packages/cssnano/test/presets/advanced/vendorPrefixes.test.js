import { test } from 'node:test';
import preset from '../../../src/presets/advanced.js';
import {
  processCSSFactory,
  testTargets,
} from '../../../../../util/testHelpers.js';

const { passthroughCSS } = processCSSFactory(
  preset({ browserslist: { query: testTargets } })
);

// Removing prefixes depends on the browsers a site supports; run autoprefixer
// before cssnano to make that choice explicitly.
test(
  'advanced preset keeps outdated vendor prefixes',
  passthroughCSS('h1{-webkit-box-sizing:content-box;box-sizing:content-box}')
);
