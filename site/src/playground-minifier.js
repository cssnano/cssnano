import postcss from 'postcss';

/** @import {PresetName, MinificationResult} from './types.js'*/

/** @param {PresetName} presetName */
async function loadPlugins(presetName) {
  let preset;
  switch (presetName) {
    case 'cssnano-preset-lite':
      preset = (await import('cssnano-preset-lite')).default;
      break;
    case 'cssnano-preset-default':
      preset = (await import('cssnano-preset-default')).default;
      break;
    case 'cssnano-preset-advanced':
      preset = (await import('cssnano-preset-advanced')).default;
      break;
    default:
      throw new Error('Invalid configuration preset');
  }

  const postcssPlugins = [];
  for (const plugin of preset().plugins) {
    const [processor, opts] = plugin;
    const optsAsRecord = /** @type {Record<string, any>} */ (opts);
    const shouldInclude = !(typeof opts === 'object' && optsAsRecord.exclude);
    if (shouldInclude) {
      postcssPlugins.push(processor(opts));
    }
  }
  return postcssPlugins;
}

/** @param {string} input
    @param {PresetName} config
    @returns {Promise<MinificationResult>}
 */
export async function minimize(input, config) {
  try {
    const postcssPlugins = await loadPlugins(config);
    const result = await postcss(postcssPlugins).process(input, {
      from: undefined,
    });
    return { ok: true, css: result.css };
  } catch (err) {
    if (err instanceof postcss.CssSyntaxError) {
      return {
        ok: false,
        error: {
          message: `CssSyntaxError: ${err.reason} (${err.line}:${err.column})`,
        },
      };
    }
    return {
      ok: false,
      error: { message: err instanceof Error ? err.message : String(err) },
    };
  }
}
