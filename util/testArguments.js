// Test paths that `pnpm test` hands to `node --test`.
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const nodeMajor = Number(process.versions.node.split('.')[0]);

const testPatterns = [
  '*.test.?(c|m)js',
  '*-test.?(c|m)js',
  '*_test.?(c|m)js',
  'test-*.?(c|m)js',
  'test.?(c|m)js',
  'test/**/*.?(c|m)js',
];

/**
 * Node 22 runs a directory argument as a module, so pass globs that match what
 * Node's documented default patterns, which newer versions apply to a directory.
 * @param {string} directory
 * @return {string[]}
 */
export function testGlobs(directory) {
  return testPatterns.map((pattern) => `${directory}/**/${pattern}`);
}

/**
 * The globs of `testGlobs(directory)` without the tests in one of its
 * subdirectories, which another step runs.
 * @param {string} directory
 * @param {string} excluded the subdirectory's name
 * @return {string[]}
 */
function testGlobsExcluding(directory, excluded) {
  return testPatterns.flatMap((pattern) => [
    `${directory}/${pattern}`,
    `${directory}/!(${excluded})/**/${pattern}`,
  ]);
}

/**
 * @param {number} [major] a Node major version, the running one by default
 * @return {string | null} why mutation testing cannot run on it, or null
 */
export function needsNode24(major = nodeMajor) {
  return major < 24 ? 'mutation testing needs Node 24' : null;
}

/**
 * Replaces each directory argument with the globs that find its tests, so a
 * path given to `pnpm test` behaves the same on every supported Node version.
 * Inside a `test/` directory every `.js` file is a test. Below Node 24, `util`
 * leaves out the mutation harness, whose tests cannot pass there.
 *
 * @param {string[]} args
 * @param {number} [major] the Node major version to expand for
 * @return {string[]}
 */
export function expandTestArguments(args, major = nodeMajor) {
  return args.flatMap((arg) => {
    const path = arg.replaceAll('\\', '/').replace(/\/+$/v, '');
    if (
      !existsSync(join(root, path)) ||
      !statSync(join(root, path)).isDirectory()
    ) {
      return [arg];
    }
    if (path.split('/').includes('test')) return [`${path}/**/*.?(c|m)js`];
    return path === 'util' && needsNode24(major)
      ? testGlobsExcluding(path, 'mutation-testing')
      : testGlobs(path);
  });
}

/**
 * The globs of the tests step and of the mutation-harness step. The harness's
 * tests start the runner, which needs Node 24, so they run apart, and CI runs
 * them on one Node version only.
 */
export const stepGlobs = {
  tests: [
    ...testGlobs('packages'),
    ...testGlobsExcluding('util', 'mutation-testing'),
  ],
  mutationHarness: testGlobs('util/mutation-testing'),
};
