import postcss from 'postcss';

/**
 * @param {string} input
 * @param {string} config
 * @param {import('@codemirror/view').EditorView} outputView
 * @return {Promise<void>}
 */
export function runOptimizer(input, outputView, config) {
  return runner(input, config)
    .then((res) => {
      const transaction = outputView.state.update({
        changes: {
          from: 0,
          to: outputView.state.doc.length,
          insert: res.css,
        },
      });
      outputView.dispatch(transaction);
    })

    .catch((err) => {
      switch (err.constructor) {
        case postcss.CssSyntaxError:
          throw new Error(
            `CssSyntaxError: ${err.reason} (${err.line}:${err.column})`
          );
        default:
          console.error(err);
          throw new Error('Unknown error. See browser console for details.');
      }
    });
}

/**
 * @param {string} config
 * @returns {Promise<import('postcss').AcceptedPlugin[]>}
 */
async function loadPlugins(config) {
  let preset;
  switch (config) {
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
    if (
      typeof opts === 'undefined' ||
      (typeof opts === 'object' && !opts.exclude) ||
      (typeof opts === 'boolean' && opts === true)
    ) {
      postcssPlugins.push(processor(opts));
    }
  }
  return postcssPlugins;
}

/**
 * @param {string} input
 * @param {string} config
 * @returns {Promise<import('postcss').Result>}
 */
async function runner(input, config) {
  const postcssPlugins = await loadPlugins(config);
  return postcss(postcssPlugins).process(input, { from: undefined });
}
