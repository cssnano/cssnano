'use strict';
const assert = require('node:assert/strict');
const { processCSSFactory } = require('../../../util/testHelpers.js');
const stylehacks = require('../src/index.js');

const { processor, processCSS, passthroughCSS } = processCSSFactory(stylehacks);

module.exports = (fixture, expected, { target, unaffected }, warnings = 1) => {
  return async () => {
    const [, , result] = await Promise.all([
      passthroughCSS(fixture, { overrideBrowserslist: target }),
      processCSS(fixture, expected, { overrideBrowserslist: unaffected }),
      processor(fixture, { lint: true, overrideBrowserslist: unaffected }),
    ]);

    assert.strictEqual(result.warnings().length, warnings);
  };
};
