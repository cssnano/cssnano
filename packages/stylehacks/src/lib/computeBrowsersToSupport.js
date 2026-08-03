'use strict';

const browserslist = require('browserslist');
const { dirname } = require('node:path');

/**
 *
 * @param {{overrideBrowserslist?: string | string[] | undefined, stats?: browserslist.Options["stats"], path?: browserslist.Options["path"], env?: browserslist.Options["env"]}} options
 * @param {browserslist.Options["stats"]} stats
 * @param {string|undefined} from
 * @param {string} [file]
 * @param {browserslist.Options["env"]} [env]
 * @returns {string[]}
 */
module.exports = function computeBrowsersToSupport(
  options,
  stats,
  from,
  file,
  env
) {
  return browserslist(options.overrideBrowserslist, {
    stats: options.stats || stats,
    path: options.path || dirname(from || file || __filename),
    env: options.env || env,
  });
};
