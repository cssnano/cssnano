import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Nothing in the workspace resolves a package through its manifest — tests
 * import the source by relative path — so a manifest can point nowhere and
 * every test still passes. That is how 8.0.3 shipped without `main`.
 *
 * `exports` is read by Node and by modern bundlers. `main` and `types` are
 * read by resolvers that predate it, such as eslint-plugin-import and
 * TypeScript's classic `moduleResolution: node`. Both have to be present, and
 * every path they name has to exist and be published.
 */

/**
 * Every string in a manifest value, however deeply nested.
 * @param {unknown} value
 * @param {string[]} found
 * @return {string[]}
 */
function targets(value, found = []) {
  if (typeof value === 'string') {
    found.push(value);
  } else if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value)) {
      targets(nested, found);
    }
  }

  return found;
}

const packagesDir = new URL('../packages/', import.meta.url);
const names = readdirSync(packagesDir).toSorted();
let failed = 0;

for (const name of names) {
  const dir = fileURLToPath(new URL(name, packagesDir));
  const manifest = JSON.parse(
    readFileSync(path.join(dir, 'package.json'), 'utf8')
  );
  const files = manifest.files ?? [];
  /** @type {string[]} */
  const problems = [];

  if (!manifest.exports?.['.']) {
    problems.push('"exports" has no "." entry');
  }

  if (!manifest.exports?.['./package.json']) {
    problems.push('"exports" does not expose "./package.json"');
  }

  if (!manifest.main) {
    problems.push('no "main", so resolvers predating "exports" cannot find it');
  }

  if (!manifest.types) {
    problems.push('no "types", so "moduleResolution": "node" finds no types');
  }

  for (const target of targets([
    manifest.exports,
    manifest.main,
    manifest.types,
  ])) {
    const relative = target.replace(/^\.\//, '');

    if (!existsSync(path.resolve(dir, relative))) {
      problems.push(`${target} does not exist`);
    } else if (
      relative !== 'package.json' &&
      !files.some((entry) => relative.startsWith(entry))
    ) {
      problems.push(`${target} is not in "files", so it is not published`);
    }
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
  console.error(`\n${failed} of ${names.length} manifests are broken.`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${names.length} package manifests.`);
}
