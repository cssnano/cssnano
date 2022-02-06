'use strict';
const { test } = require('uvu');
const {
  processCSSWithPresetFactory,
} = require('../../../util/integrationTestHelpers.js');
const preset = require('..');

const { processCSS } = processCSSWithPresetFactory(preset);

test(
  'should remove outdated vendor prefixes',
  processCSS(
    'h1{-webkit-box-sizing:content-box;box-sizing:content-box}',
    'h1{box-sizing:content-box}'
  )
);

const { passthroughCSS } = processCSSWithPresetFactory(
  preset({
    autoprefixer: { env: 'safari5' },
  })
);

test(
  'should not remove outdated vendor prefixes when minifying for older browsers',
  passthroughCSS('h1{-webkit-border-radius:5px;border-radius:5px}')
);

const { passthroughCSS: exclude } = processCSSWithPresetFactory(
  preset({
    autoprefixer: { exclude: true },
  })
);

test(
  'should not remove outdated vendor prefixes if excluded',
  exclude('h1{-webkit-box-sizing:content-box;box-sizing:content-box}')
);
test.run();
