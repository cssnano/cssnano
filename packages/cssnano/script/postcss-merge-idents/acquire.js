/**
 * Builds data/mergeIdents.json from @webref/css. `script/acquire.js` writes
 * it, and `pnpm test` checks that the committed copy matches.
 */
import { buildMergeIdents, serialize } from './lib/webrefMergeIdents.js';
import { validate } from './lib/webrefMergeIdentsValidate.js';

/**
 * @param {{ webref: any }} inputs
 * @return {{ files: Record<string, string>, summary: string }}
 */
export function acquire({ webref }) {
  const data = buildMergeIdents(webref);
  validate(data);

  return {
    files: {
      'src/plugins/postcss-merge-idents/data/mergeIdents.json': serialize(data),
    },
    summary:
      `${data.cssWideKeywords.length} CSS-wide, ` +
      `${data.keyframes.shorthandKeywords.length} animation and ` +
      `${data.counterStyle.keywords.length} counter style keywords, ` +
      `${data.counterStyle.functions.size} counter style function slots`,
  };
}
