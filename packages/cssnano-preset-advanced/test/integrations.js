'use strict';
const { join } = require('path');
const { test } = require('uvu');
const assert = require('uvu/assert');
const {
  integrationTests,
  loadPreset,
  processCSSWithPresetFactory,
} = require('../../../util/integrationTestHelpers.js');
const preset = require('..');

const withDefaults = processCSSWithPresetFactory(preset);
const withBrowserslist = processCSSWithPresetFactory(
  preset({
    path: join(__dirname, 'browserslist/example.css'),
    env: 'modern',

    // Add Autoprefix vendor prefixes to confirm output
    // changes based on Browserslist options
    autoprefixer: {
      add: true,
    },
  })
);

test(
  'should process CSS with default options',
  withDefaults.processCSS(
    'button { color: hsla(0 100% 50% / 40%); appearance: none }',
    'button{appearance:none;color:rgba(255,0,0,.4)}'
  )
);

test(
  'should process CSS with Browserslist options',
  withBrowserslist.processCSS(
    'button { color: hsla(0 100% 50% / 40%); appearance: none }',
    'button{-webkit-appearance:none;-moz-appearance:none;appearance:none;color:#f006}'
  )
);

test(
  'should correctly handle the framework tests',
  integrationTests(preset, `${__dirname}/integrations`)
);

function excludeProcessor(options) {
  const input = `h1{z-index:10}`;

  return () =>
    loadPreset(preset(options))
      .process(input, { from: undefined })
      .then(({ css }) => {
        assert.is(css, input);
      });
}

test('exclude zindex', excludeProcessor({ zindex: false }));

test('exclude zindex #1', excludeProcessor({ zindex: { exclude: true } }));
test.run();
