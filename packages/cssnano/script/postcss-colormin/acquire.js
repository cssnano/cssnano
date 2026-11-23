/**
 * Builds data/colorProperties.json from @webref/css. `script/acquire.js`
 * writes it, and `pnpm test` checks that the committed copy matches.
 */
import {
  buildColorProperties,
  serialize,
  validate,
} from './lib/webrefColors.js';

/**
 * @param {{ webref: any }} inputs
 * @return {{ files: Record<string, string>, summary: string }}
 */
export function acquire({ webref }) {
  const data = buildColorProperties(webref);
  validate(data);

  return {
    files: {
      'src/plugins/postcss-colormin/data/colorProperties.json': serialize(data),
    },
    summary: `${data.length} color properties`,
  };
}
