'use strict';
const { describe, test } = require('node:test');
const {
  idempotencyTests,
  integrationTests,
} = require('../../../util/integrationTestHelpers.js');
const preset = require('../src/index.js');

describe('lite preset framework integrations', () => {
  test(
    'should correctly handle the framework tests',
    { concurrency: true },
    integrationTests(preset, `${__dirname}/integrations`)
  );
  test(
    'should be idempotent on integration outputs',
    { concurrency: true },
    idempotencyTests(preset, `${__dirname}/integrations`)
  );
});
