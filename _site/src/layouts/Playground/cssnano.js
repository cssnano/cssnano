import { postcssPlugin } from 'postcss';
import preset from 'cssnano-preset-default';

// svgo uses fs, so we can't use it
const { plugins } = preset({ svgo: true });

function initializePlugin(plugin, css, result) {
  if (Array.isArray(plugin)) {
    const [processor, opts] = plugin;
    if (
      typeof opts === 'undefined' ||
      (typeof opts === 'object' && !opts.exclude)
    ) {
      return Promise.resolve(processor(opts)(css, result));
    }
  } else {
    return Promise.resolve(plugin()(css, result));
  }
  // Handle excluded plugins
  return Promise.resolve();
}

export default postcssPlugin('cssnano', () => {
  return (css, result) => {
    return plugins.reduce((promise, plugin) => {
      return promise.then(initializePlugin.bind(null, plugin, css, result));
    }, Promise.resolve());
  };
});
