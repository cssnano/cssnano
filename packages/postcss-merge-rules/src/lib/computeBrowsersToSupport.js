import { fileURLToPath } from 'node:url';
import browserslist from 'browserslist';
import nodepath from 'node:path';

const { dirname } = nodepath;

/**
 *
 * @param {{overrideBrowserslist?: string | string[] | undefined, stats?: browserslist.Options["stats"], path?: browserslist.Options["path"], env?: browserslist.Options["env"]}} options
 * @param {browserslist.Options["stats"]} stats
 * @param {string|undefined} from
 * @param {string} [file]
 * @param {browserslist.Options["env"]} [env]
 * @returns {string[]}
 */
function computeBrowsersToSupport(options, stats, from, file, env) {
  return browserslist(options.overrideBrowserslist, {
    stats: options.stats || stats,
    path:
      options.path || dirname(from || file || fileURLToPath(import.meta.url)),
    env: options.env || env,
  });
}

export default computeBrowsersToSupport;
