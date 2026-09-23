/**
 * Regenerates src/data/colorProperties.json from @webref/css.
 *
 * Run with `pnpm run acquire` after bumping the pinned @webref/css version, then
 * `pnpm fixlint`, to reformat the generated file. Commit the
 * result: a data refresh has to go through
 * the test suite before reaching users.
 */
import { writeFileSync } from 'node:fs';
import css from '@webref/css';

import {
  buildColorProperties,
  serialize,
  validate,
} from './lib/webrefColors.mjs';

const webref = await css.listAll();
const data = buildColorProperties(webref);
validate(data);

const target = new URL('../src/data/colorProperties.json', import.meta.url);
writeFileSync(target, serialize(data));

console.log(`Wrote ${data.length} color properties.`);
