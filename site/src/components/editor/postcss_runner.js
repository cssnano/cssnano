/* eslint-disable no-warning-comments */
/* eslint-disable no-unused-vars */
import postcss from 'postcss';
import cssnanoPresetLite from 'cssnano-preset-lite';
import { pkgnameToVarName } from '../../helper/naming';

export default (input, config) => {
  const { plugins: nanoPlugins } = cssnanoPresetLite();
  console.log(cssnanoPresetLite);
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
      .process(input)
      .then((res) => resolve(res))
      .catch((err) => reject(err));
  });
};
