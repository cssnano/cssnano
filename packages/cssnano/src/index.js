import postcss from 'postcss';
import { resolveOptions } from './config.js';

/** @typedef {import('./config.js').Options} Options */
/** @typedef {import('./config.js').Config} Config */

/**
 * @param {Options=} options
 * @return {import('postcss').Processor}
 */
function cssnanoPlugin(options = {}) {
  return postcss(resolveOptions(options));
}

/** @type {true} */
cssnanoPlugin.postcss = true;

export { cssnanoPlugin as default, cssnanoPlugin as 'module.exports' };
