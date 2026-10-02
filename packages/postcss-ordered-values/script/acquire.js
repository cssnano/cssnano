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
  buildCssWideKeywords,
  serialize as serializeCssWideKeywords,
  validate as validateCssWideKeywords,
} from './lib/webrefCssWideKeywords.js';
import {
  buildEasingFunctions,
  serialize as serializeEasingFunctions,
  validate as validateEasingFunctions,
} from './lib/webrefEasingFunctions.js';

const webref = await css.listAll();
const easing = buildEasingFunctions(webref);
validateEasingFunctions(easing);

writeFileSync(
  new URL('../src/rules/easingFunctions.json', import.meta.url),
  serializeEasingFunctions(easing)
);

const cssWide = buildCssWideKeywords(webref);
validateCssWideKeywords(cssWide);

writeFileSync(
  new URL('../src/rules/cssWideKeywords.json', import.meta.url),
  serializeCssWideKeywords(cssWide)
);

console.log(
  `Wrote ${easing.functions.length} easing functions and ` +
    `${cssWide.keywords.length} CSS-wide keywords.`
);
