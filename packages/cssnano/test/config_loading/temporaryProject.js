import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { afterEach, beforeEach } from 'node:test';

/**
 * Registers hooks in the enclosing describe() that run each test in a new
 * temporary directory, and restore the working directory before removing it.
 * Hooks registered by the caller run after these, so they can write fixtures.
 *
 * @param {string} prefix the start of the directory's name
 * @returns {() => string} the directory of the running test
 */
export function temporaryProject(prefix) {
  let directory = '';
  let previousWorkingDirectory = '';

  beforeEach(() => {
    directory = mkdtempSync(`${tmpdir()}/${prefix}`);
    previousWorkingDirectory = process.cwd();
    process.chdir(directory);
  });

  afterEach(() => {
    process.chdir(previousWorkingDirectory);
    rmSync(directory, { recursive: true, force: true });
  });

  return () => directory;
}
