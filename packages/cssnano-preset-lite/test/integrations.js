'use strict';
const { test } = require('uvu');
const { integrationTests } = require('../../../util/integrationTestHelpers.js');
const preset = require('..');

test(
  'should correctly handle the framework tests',
  integrationTests(preset, `${__dirname}/integrations`)
);
test.run();
