/**
 * Builds data/cssWideKeywords.json from @webref/css. `script/acquire.js`
 * writes it, and `pnpm test` checks that the committed copy matches.
 */
import {
  buildCssWideKeywords,
  serialize,
  validate,
} from '../../../../util/webref/cssWideKeywords.js';

/**
 * @param {{ webref: any }} inputs
 * @return {{ files: Record<string, string>, summary: string }}
 */
export function acquire({ webref }) {
  const data = buildCssWideKeywords(webref);
  validate(data);

  return {
    files: {
      'src/plugins/postcss-minify-font-values/data/cssWideKeywords.json':
        serialize(data),
    },
    summary: `${data.keywords.length} CSS-wide keywords`,
  };
}
