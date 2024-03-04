'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const { processCSSFactory } = require('../../../util/testHelpers.js');
const stylehacks = require('..');

const { processor, processCSS, passthroughCSS } = processCSSFactory(stylehacks);

module.exports = (fixture, expected, { target, unaffected }, warnings = 1) => {
  return () =>
    Promise.all([
      passthroughCSS(fixture, { overrideBrowserslist: target }),
      processCSS(fixture, expected, { overrideBrowserslist: unaffected }),
      processor(fixture, { lint: true, overrideBrowserslist: unaffected }).then(
        (result) => {
          assert.is(result.warnings().length, warnings);
        }
      ),
    ]);
};
test.run();
