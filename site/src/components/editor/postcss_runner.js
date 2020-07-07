/* eslint-disable no-warning-comments */
/* eslint-disable no-unused-vars */
import postcss from 'postcss';
import { pkgnameToVarName } from '../../helper/naming';

/**
 * using moduleMaps and not with imports to lazy load them because of this error
 * editor lazy namespace object?f49d:5 Uncaught (in promise) Error: Cannot find module 'cssnano-preset-default'
    at eval (eval at ./src/components/editor lazy recursive
 * need to fix this
 */
const moduleMap = {
  cssnanoPresetDefault: require('cssnano-preset-default'),
  cssnanoPresetAdvanced: require('cssnano-preset-advanced'),
};

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

export default (input, config) => {
  const { plugins } = moduleMap[pkgnameToVarName(config[0])](config[1]);
  const pluginRunner = (css, result) =>
    plugins.reduce((promise, plugin) => {
      return promise.then(initializePlugin.bind(null, plugin, css, result));
    }, Promise.resolve());
  return new Promise((resolve, reject) => {
    postcss(pluginRunner)
      .process(input)
      .then((res) => resolve(res))
      .catch((err) => reject(err));
  });
};
