import postcss from 'postcss';

/** @import {PresetId, MinificationResult} from './types.js'*/

// The preset modules are imported by their subpaths, because the cssnano entry
// reads configuration files from the file system, which a browser cannot do.
/** @param {PresetId} presetId */
async function loadPlugins(presetId) {
  switch (presetId) {
    case 'lite':
      return (await import('cssnano/presets/lite')).default();
    case 'default':
      return (await import('cssnano/presets/default')).default();
    case 'advanced':
      return (await import('cssnano/presets/advanced')).default();
    default:
      throw new Error('Invalid configuration preset');
  }
}

/** @param {string} input
    @param {PresetId} preset
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
