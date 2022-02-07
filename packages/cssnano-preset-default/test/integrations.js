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
  const input = `h1{color:black}`;

  return () =>
    loadPreset(preset(options))
      .process(input, { from: undefined })
      .then(({ css }) => {
        assert.is(css, input);
      });
}

test('exclude colormin', excludeProcessor({ colormin: false }));

test('exclude colormin #1', excludeProcessor({ colormin: { exclude: true } }));
test.run();
