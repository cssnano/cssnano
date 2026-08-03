export = computeBrowsersToSupport;
/**
 *
 * @param {{overrideBrowserslist?: string | string[] | undefined, stats?: browserslist.Options["stats"], path?: browserslist.Options["path"], env?: browserslist.Options["env"]}} options
 * @param {browserslist.Options["stats"]} stats
 * @param {string|undefined} from
 * @param {string} [file]
 * @param {browserslist.Options["env"]} [env]
 * @returns {string[]}
 */
declare function computeBrowsersToSupport(options: {
    overrideBrowserslist?: string | string[] | undefined;
    stats?: browserslist.Options["stats"];
    path?: browserslist.Options["path"];
    env?: browserslist.Options["env"];
}, stats: browserslist.Options["stats"], from: string | undefined, file?: string, env?: browserslist.Options["env"]): string[];
import browserslist = require('browserslist');
//# sourceMappingURL=computeBrowsersToSupport.d.ts.map