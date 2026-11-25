import { writeFileSync } from 'node:fs';
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import cssnano from '../../src/index.js';
import { presetImport } from './presetSpecifiers.js';
import { temporaryProject } from './temporaryProject.js';

describe('cssnano configuration file errors', () => {
  const temporaryDirectory = temporaryProject('cssnano-config-errors-');

  beforeEach(() => {
    writeFileSync(
      `${temporaryDirectory()}/package.json`,
      JSON.stringify({ type: 'module' })
    );
  });

  test('keeps the SyntaxError class of a configuration file that does not parse', () => {
    writeFileSync(
      `${temporaryDirectory()}/cssnano.config.js`,
      'export default {'
    );
    assert.throws(() => cssnano(), SyntaxError);
  });

  test('keeps the AggregateError class of an error that a configuration file throws', () => {
    writeFileSync(
      `${temporaryDirectory()}/cssnano.config.js`,
      'throw new AggregateError([], "bad");\n'
    );
    assert.throws(() => cssnano(), AggregateError);
  });

  test('names the file once when a configuration file that throws is loaded again, because Node rethrows the same error', () => {
    writeFileSync(
      `${temporaryDirectory()}/cssnano.config.js`,
      'throw new Error("boom");\n'
    );
    assert.throws(() => cssnano(), { message: 'cssnano.config.js: boom' });
    assert.throws(() => cssnano(), { message: 'cssnano.config.js: boom' });
  });

  test('names the file of a frozen error, which cannot take a new message, and keeps the error as its cause', () => {
    writeFileSync(
      `${temporaryDirectory()}/cssnano.config.js`,
      'throw Object.freeze(new Error("boom"));\n'
    );
    assert.throws(
      () => cssnano(),
      (error) =>
        error.message === 'cssnano.config.js: boom' &&
        error.cause instanceof Error &&
        error.cause.message === 'boom'
    );
  });

  test('names the file in the stack of an error whose stack was read before it was thrown', () => {
    writeFileSync(
      `${temporaryDirectory()}/cssnano.config.js`,
      'const error = new Error("boom");\nvoid error.stack;\nthrow error;\n'
    );
    assert.throws(
      () => cssnano(),
      (error) => error.stack.startsWith('Error: cssnano.config.js: boom\n')
    );
  });

  test('explains that cssnano cannot load a configuration file that uses top-level await', () => {
    writeFileSync(
      `${temporaryDirectory()}/cssnano.config.js`,
      `const lite = await import(${presetImport('lite')});\nexport default { preset: lite.default };\n`
    );
    assert.throws(() => cssnano(), {
      message:
        /^cssnano\.config\.js: .*top-level await.*(?:CommonJS|synchronously)/v,
    });
  });
});
