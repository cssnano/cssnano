/**
 * Builds data/identSlots.json from @webref/css. `script/acquire.js` writes
 * it, and `pnpm test` checks that the committed copy matches.
 */
import { buildIdentSlots, serialize } from './lib/webrefIdents.js';
import { validate } from './lib/webrefIdentsValidate.js';

/**
 * @param {{ webref: any }} inputs
 * @return {{ files: Record<string, string>, summary: string }}
 */
export function acquire({ webref }) {
  const data = buildIdentSlots(webref);
  validate(data);

  return {
    files: {
      'src/plugins/postcss-reduce-idents/data/identSlots.json': serialize(data),
    },
    summary:
      `${data.keyframes.properties.length} keyframes, ` +
      `${data.counterStyle.properties.length + data.counterStyle.functionProperties.length} counter style, ` +
      `${data.counter.properties.length} counter and ` +
      `${data.grid.templateProperties.length + data.grid.referenceProperties.length} grid slots`,
  };
}
