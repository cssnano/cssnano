/**
 * Builds the webref-derived rule data of postcss-ordered-values from
 * @webref/css. `script/acquire.js` writes it, and `pnpm test` checks that the
 * committed copies match.
 */
import {
  buildCssWideKeywords,
  serialize as serializeCssWideKeywords,
  validate as validateCssWideKeywords,
} from '../../../../util/webref/cssWideKeywords.js';
import {
  buildEasingFunctions,
  serialize as serializeEasingFunctions,
  validate as validateEasingFunctions,
} from './lib/webrefEasingFunctions.js';

/**
 * @param {{ webref: any }} inputs
 * @return {{ files: Record<string, string>, summary: string }}
 */
export function acquire({ webref }) {
  const easing = buildEasingFunctions(webref);
  validateEasingFunctions(easing);
  const cssWide = buildCssWideKeywords(webref);
  validateCssWideKeywords(cssWide);

  return {
    files: {
      'src/plugins/postcss-ordered-values/rules/easingFunctions.json':
        serializeEasingFunctions(easing),
      'src/plugins/postcss-ordered-values/rules/cssWideKeywords.json':
        serializeCssWideKeywords(cssWide),
    },
    summary:
      `${easing.functions.length} easing functions and ` +
      `${cssWide.keywords.length} CSS-wide keywords`,
  };
}
