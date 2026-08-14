/**
 * Regenerates src/data/longhands.json from @webref/css.
 *
 * Run with `npm run acquire` after bumping the pinned @webref/css version, then
 * `pnpm fixlint` to reformat the generated file. Commit the result because
 * a data refresh has to go through the test suite.
 */
import { writeFileSync } from 'node:fs';
import css from '@webref/css';

import { buildLonghands, serialize, validate } from './lib/webrefLonghands.mjs';

const data = buildLonghands(await css.listAll());
validate(data);

const target = new URL('../src/data/longhands.json', import.meta.url);
writeFileSync(target, serialize(data));

console.log(
  `Wrote ${data.shorthands.size} shorthands, ${data.initialValues.size} initial values, ` +
    `${data.borderProperties.length} border properties, ${data.namedColors.length} named colours ` +
    `and ${data.colorFunctions.length} colour functions.`
);
