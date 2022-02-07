'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const {
  integrationTests,
  loadPreset,
} = require('../../../util/integrationTestHelpers.js');
const preset = require('..');

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
