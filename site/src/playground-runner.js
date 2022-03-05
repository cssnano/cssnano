import cssnanoPresetLite from 'cssnano-preset-lite';
import cssnanoPresetDefault from 'cssnano-preset-default';
import cssnanoPresetAdvanced from 'cssnano-preset-advanced';
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
 * @param {string} input
 * @param {string} config
 */
function runner(input, config) {
  let nanoPlugins;
  switch (config) {
    case 'cssnano-preset-lite':
      nanoPlugins = cssnanoPresetLite().plugins;
      break;
    case 'cssnano-preset-default':
      nanoPlugins = cssnanoPresetDefault().plugins;
      break;
    case 'cssnano-preset-advanced':
      nanoPlugins = cssnanoPresetAdvanced().plugins;
      break;
    default:
      return Promise.reject(new Error('Invalid configuration preset'));
  }

  const postcssPlugins = [];
  for (const plugin of nanoPlugins) {
    const [processor, opts] = plugin;
    if (
      typeof opts === 'undefined' ||
      (typeof opts === 'object' && !opts.exclude) ||
      (typeof opts === 'boolean' && opts === true)
    ) {
      postcssPlugins.push(processor(opts));
    }
  }
  return new Promise((resolve, reject) => {
    postcss(postcssPlugins)
      .process(input, { from: undefined })
      .then((res) => resolve(res))
      .catch((err) => reject(err));
  });
}
