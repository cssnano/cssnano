'use strict';
const { test } = require('node:test');
const { integrationTests } = require('../../../util/integrationTestHelpers.js');
const preset = require('..');

test(
  'should correctly handle the framework tests',
  integrationTests(preset, `${__dirname}/integrations`)
);
