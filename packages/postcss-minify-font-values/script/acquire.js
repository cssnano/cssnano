/**
 * Regenerates src/data/cssWideKeywords.json from @webref/css.
 *
 * Run with `pnpm run acquire` after bumping the pinned @webref/css version,
 * then `pnpm fixlint` to reformat the generated file. Commit the result: a
 * data refresh has to go through the test suite before reaching users.
 */
import { writeFileSync } from 'node:fs';
import css from '@webref/css';

import {
  buildCssWideKeywords,
  serialize,
  validate,
} from './lib/webrefCssWideKeywords.js';

const data = buildCssWideKeywords(await css.listAll());
validate(data);

writeFileSync(
  new URL('../src/data/cssWideKeywords.json', import.meta.url),
  serialize(data)
);

console.log(`Wrote ${data.keywords.length} CSS-wide keywords.`);
