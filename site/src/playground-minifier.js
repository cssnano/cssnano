import postcss from 'postcss';
import { enabledPlugins } from './utils/enabledPlugins.js';
import { playgroundTargets } from './utils/playgroundTargets.js';

/** @import {PresetName, MinificationResult} from './types.js'*/

/** @param {PresetName} presetName */
async function loadPlugins(presetName) {
  let preset;
  switch (presetName) {
    case 'cssnano-preset-lite':
      preset = (await import('../../packages/cssnano/src/presets/lite.js'))
        .default;
      break;
    case 'cssnano-preset-default':
      preset = (await import('../../packages/cssnano/src/presets/default.js'))
        .default;
      break;
    case 'cssnano-preset-advanced':
      preset = (await import('../../packages/cssnano/src/presets/advanced.js'))
        .default;
      break;
    default:
      throw new Error('Invalid configuration preset');
  }

  return enabledPlugins(() =>
    preset({ overrideBrowserslist: playgroundTargets })
  ).map(([processor, opts]) => processor(opts));
}

/** @param {string} input
    @param {PresetName} preset
    @returns {Promise<MinificationResult>}
 */
export async function minimize(input, preset) {
  try {
    const postcssPlugins = await loadPlugins(preset);
    const result = await postcss(postcssPlugins).process(input, {
      from: undefined,
    });
    return { ok: true, css: result.css };
  } catch (err) {
    if (err instanceof postcss.CssSyntaxError) {
      return {
        ok: false,
        error: {
          message: `${err.reason} at line ${err.line}, column ${err.column}`,
          input: true,
        },
      };
    }
    return {
      ok: false,
      error: {
        message: err instanceof Error ? err.message : String(err),
        input: false,
      },
    };
  }
}
