'use strict';
const { test } = require('node:test');
const { integrationTests } = require('../../../util/integrationTestHelpers.js');
const preset = require('../src/index.js');

test(
  'should correctly handle the framework tests',
  { concurrency: true },
  integrationTests(preset, `${__dirname}/integrations`)
);
