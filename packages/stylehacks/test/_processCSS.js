import assert from 'node:assert/strict';
import { processCSSFactory } from '../../../util/testHelpers.js';
import stylehacks from '../src/index.js';

const { processor, processCSS, passthroughCSS } = processCSSFactory(stylehacks);
export default (fixture, expected, { target, unaffected }, warnings = 1) => {
  return async () => {
    const [, , result] = await Promise.all([
      passthroughCSS(fixture, { overrideBrowserslist: target }),
      processCSS(fixture, expected, { overrideBrowserslist: unaffected }),
      processor(fixture, { lint: true, overrideBrowserslist: unaffected }),
    ]);

    assert.strictEqual(result.warnings().length, warnings);
  };
};
