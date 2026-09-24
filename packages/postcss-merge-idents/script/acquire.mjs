/**
 * Regenerates src/data/mergeIdents.json from @webref/css.
 *
 * Run with `pnpm run acquire` after bumping the pinned @webref/css version,
 * then `pnpm fixlint`, to reformat the generated file. Commit the result: a
 * data refresh has to go through the test suite before reaching users.
 */
import { writeFileSync } from 'node:fs';
import css from '@webref/css';

import {
  buildMergeIdents,
  serialize,
  validate,
} from './lib/webrefMergeIdents.mjs';

const data = buildMergeIdents(await css.listAll());
validate(data);

const target = new URL('../src/data/mergeIdents.json', import.meta.url);
writeFileSync(target, serialize(data));

console.log(
  `Wrote ${data.cssWideKeywords.length} CSS-wide, ` +
    `${data.keyframes.shorthandKeywords.length} animation and ` +
    `${data.counterStyle.keywords.length} counter style keywords, ` +
    `${data.counterStyle.functions.size} counter style function slots.`
);
