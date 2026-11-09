/**
 * Applies every mutant of the merge group in memory, without running any, and
 * prints each stale one: a mutant whose fragment no longer matches its target
 * once the source moved. Exits 1 when any mutant is stale.
 *
 * Usage: node packages/cssnano/script/passes/merge/staleCheck.js
 */
import {
  findStale,
  loadCatalogs,
} from '../../../../../util/mutation-testing/mutation-testing.js';
import { groups } from '../../../mutation/catalogs.js';

const catalogs = await loadCatalogs(
  groups.merge.flatMap((run) => run.catalogs)
);
const total = catalogs.reduce((n, { mutations }) => n + mutations.length, 0);
const stale = await findStale(catalogs);
for (const { name, detail } of stale) {
  console.log(`stale: ${name} | ${detail}`);
}
console.log(`stale: ${stale.length} of ${total} mutants in group merge`);
if (stale.length) process.exitCode = 1;
