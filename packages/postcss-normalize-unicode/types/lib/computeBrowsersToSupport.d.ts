import browserslist from 'browserslist';
export type OurOptions = {
    overrideBrowserslist?: string | string[] | undefined;
    stats?: browserslist.Options["stats"];
    path?: browserslist.Options["path"];
    env?: browserslist.Options["env"];
};
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
declare function computeBrowsersToSupport(query?: string | null, options?: OurOptions, stats?: browserslist.Options["stats"], from?: string | undefined, file?: string, env?: browserslist.Options["env"]): string[];
export default computeBrowsersToSupport;
//# sourceMappingURL=computeBrowsersToSupport.d.ts.map