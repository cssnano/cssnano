'use strict';
const { describe, test } = require('node:test');
const { integrationTests } = require('../../../util/integrationTestHelpers.js');
const preset = require('../src/index.js');

describe('lite preset framework integrations', () => {
  test(
    'should correctly handle the framework tests',
    { concurrency: true },
    integrationTests(preset, `${__dirname}/integrations`)
  );
});
