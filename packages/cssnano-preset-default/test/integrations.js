'use strict';
const { join } = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
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
    'button{appearance:none;color:#f006}'
  )
);

test(
  'should correctly handle the framework tests',
  integrationTests(preset, `${__dirname}/integrations`)
);

function excludeProcessor(options) {
  const input = `h1{color:black}`;

  return () =>
    loadPreset(preset(options))
      .process(input, { from: undefined })
      .then(({ css }) => {
        assert.strictEqual(css, input);
      });
}

test('exclude colormin', excludeProcessor({ colormin: false }));

test('exclude colormin #1', excludeProcessor({ colormin: { exclude: true } }));
