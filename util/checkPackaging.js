import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Checks that every package can still be resolved by tools that predate
 * `exports`, which read `main` and `types` instead.
 *
 * Nothing else here covers that. The test suite imports the source by
 * relative path, and Node resolves the workspace through `exports`, so a
 * package can become unresolvable for those tools while everything passes.
 * That is how 8.0.3 shipped without `main`.
 *
 * The resolving is done by `resolve`, the same package eslint-plugin-import
 * uses, rather than by a copy of its algorithm kept here.
 */

const require = createRequire(import.meta.url);
const resolve = require('resolve');

const root = fileURLToPath(new URL('..', import.meta.url));
const packagesDir = path.join(root, 'packages');
const names = readdirSync(packagesDir).toSorted();
let failed = 0;

for (const name of names) {
  const dir = path.join(packagesDir, name);
  const manifest = JSON.parse(
    readFileSync(path.join(dir, 'package.json'), 'utf8')
  );
  /** @type {string[]} */
  const problems = [];

  try {
    resolve.sync(`./packages/${name}`, { basedir: root });
  } catch {
    problems.push('does not resolve without `exports` support, add `main`');
  }

  if (!manifest.types || !existsSync(path.join(dir, manifest.types))) {
    problems.push('has no `types` file, TypeScript on `node` finds no types');
  }

  if (!manifest.exports?.['./package.json']) {
    problems.push('does not export `./package.json`');
  }

  if (problems.length) {
    failed++;
    console.error(`${name}:`);
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
  }
}

if (failed) {
  console.error(`\n${failed} of ${names.length} packages have problems.`);
  process.exitCode = 1;
} else {
  console.log(`Resolved ${names.length} packages.`);
}
