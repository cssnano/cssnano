// Test paths that `pnpm test` hands to `node --test`.
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');

/**
 * Node 22 runs a directory argument as a module, so pass globs that match what
 * Node's documented default patterns, which newer versions apply to a directory.
 * @param {string} directory
 * @return {string[]}
 */
export function testGlobs(directory) {
  return [
    '**/*.test.?(c|m)js',
    '**/*-test.?(c|m)js',
    '**/*_test.?(c|m)js',
    '**/test-*.?(c|m)js',
    '**/test.?(c|m)js',
    '**/test/**/*.?(c|m)js',
  ].map((pattern) => `${directory}/${pattern}`);
}

/**
 * Replaces each directory argument with the globs that find its tests, so a
 * path given to `pnpm test` behaves the same on every supported Node version.
 * Inside a `test/` directory every `.js` file is a test.
 *
 * @param {string[]} args
 * @return {string[]}
 */
export function expandTestArguments(args) {
  return args.flatMap((arg) => {
    const path = arg.replaceAll('\\', '/').replace(/\/+$/v, '');
    if (
      !existsSync(join(root, path)) ||
      !statSync(join(root, path)).isDirectory()
    ) {
      return [arg];
    }
    return path.split('/').includes('test')
      ? [`${path}/**/*.?(c|m)js`]
      : testGlobs(path);
  });
}
