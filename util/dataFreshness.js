// Fails when a generated data file differs from what the installed upstream
// packages produce, so that a version bump without `pnpm acquire` is caught
// by name instead of by an unrelated test.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Compares parsed data, not bytes: `pnpm fixlint` reformats the generated
 * files, but never reorders their keys or arrays.
 *
 * @param {string | undefined} text
 * @return {string | undefined}
 */
function normalized(text) {
  return text === undefined ? undefined : JSON.stringify(JSON.parse(text));
}

/**
 * @param {Record<string, string>} built Generated text by path.
 * @param {(path: string) => string | undefined} readCommitted
 * @return {string[]} The paths whose committed data differs from the built.
 */
export function staleFiles(built, readCommitted) {
  return Object.entries(built)
    .filter(
      ([path, text]) => normalized(text) !== normalized(readCommitted(path))
    )
    .map(([path]) => path);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { acquireAll, packageRoot } =
    await import('../packages/cssnano/script/acquire.js');
  const { files } = await acquireAll();
  const stale = staleFiles(files, (path) => {
    try {
      return readFileSync(join(packageRoot, path), 'utf8');
    } catch {
      return undefined;
    }
  });
  for (const path of stale) {
    console.error(`${path} is stale; run pnpm acquire && pnpm fixlint`);
  }
  console.log(
    `data: ${stale.length ? 'stale' : 'fresh'} files=${Object.keys(files).length} stale=${stale.length}`
  );
  process.exitCode = stale.length ? 1 : 0;
}
