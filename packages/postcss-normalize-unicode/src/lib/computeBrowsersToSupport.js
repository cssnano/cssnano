'use strict';

const browserslist = require('browserslist');
const { dirname } = require('node:path');

/** @typedef {{overrideBrowserslist?: string | string[] | undefined, stats?: browserslist.Options["stats"], path?: browserslist.Options["path"], env?: browserslist.Options["env"]}} OurOptions
/**
 * @param {string | null} [query]
 * @param {OurOptions} [options]
 * @param {browserslist.Options["stats"]} [stats]
 * @param {string|undefined} [from]
 * @param {string} [file]
 * @param {browserslist.Options["env"]} [env]
 * @returns {string[]}
 */
module.exports = function computeBrowsersToSupport(
  query,
  options,
  stats,
  from,
  file,
  env
) {
  if (!query) {
    return browserslist(
      /** @type {OurOptions} */ (options).overrideBrowserslist,
      {
        stats: /** @type {OurOptions} */ (options).stats || stats,
        path:
          /** @type {OurOptions} */ (options).path ||
          dirname(from || file || __filename),
        env: /** @type {OurOptions} */ (options).env || env,
      }
    );
  }
  return browserslist(query);
};
