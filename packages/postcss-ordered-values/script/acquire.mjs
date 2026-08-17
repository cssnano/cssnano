/**
 * Regenerates webref-derived rule data from @webref/css.
 *
 * Run with `npm run acquire` after bumping the pinned @webref/css version, then
 * `pnpm fixlint` to reformat the generated file. Commit the result because
 * a data refresh has to go through the test suite.
 */
import { writeFileSync } from 'node:fs';
import css from '@webref/css';

import {
  buildEasingFunctions,
  serialize as serializeEasingFunctions,
  validate as validateEasingFunctions,
} from './lib/webrefEasingFunctions.mjs';

const webref = await css.listAll();
const easing = buildEasingFunctions(webref);
validateEasingFunctions(easing);

writeFileSync(
  new URL('../src/rules/easingFunctions.json', import.meta.url),
  serializeEasingFunctions(easing)
);

console.log(`Wrote ${easing.functions.length} easing functions.`);
