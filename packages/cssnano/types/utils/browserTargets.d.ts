import type { Result } from 'postcss';
export type SharedTargets = {
    /**
     * the positional queries of browserslist
     */
    query?: string | string[];
    env?: string;
    stats?: string | Record<string, Record<string, number>> | {
        dataByBrowser: Record<string, Record<string, number>>;
    };
    /**
     * the directory to search for the config, default the PostCSS from
     */
    path?: string;
    /**
     * the config file to read instead of the one found
     */
    config?: string;
    ignoreUnknownVersions?: boolean;
    mobileToDesktop?: boolean;
    throwOnMissing?: boolean;
};
export type TargetOptions = {
    [browserTargets]?: SharedTargets;
};
export type Browserslist = ((query: SharedTargets['query'], options: Omit<SharedTargets, 'query'>) => string[]) & {
    loadConfig: (options: Pick<SharedTargets, 'path' | 'env' | 'config'>) => string | string[] | undefined;
};
/** @import {Result} from 'postcss' */
/**
 * The browser targets a preset gives every target-reading plugin. The fields
 * are the options of browserslist; an unset one is left to browserslist.
 * @typedef {object} SharedTargets
 * @property {string | string[]} [query] the positional queries of browserslist
 * @property {string} [env]
 * @property {string | Record<string, Record<string, number>> | {dataByBrowser: Record<string, Record<string, number>>}} [stats]
 * @property {string} [path] the directory to search for the config, default the PostCSS from
 * @property {string} [config] the config file to read instead of the one found
 * @property {boolean} [ignoreUnknownVersions]
 * @property {boolean} [mobileToDesktop]
 * @property {boolean} [throwOnMissing]
 */
/**
 * The options of a plugin that reads the browser targets. Only a preset sets
 * browserTargets, so a plugin that runs alone has none and uses the defaults.
 * @typedef {{[browserTargets]?: SharedTargets}} TargetOptions
 */
/**
 * @typedef {((query: SharedTargets['query'], options: Omit<SharedTargets, 'query'>) => string[]) & {loadConfig: (options: Pick<SharedTargets, 'path' | 'env' | 'config'>) => string | string[] | undefined}} Browserslist
 */
/**
 * Key under which a preset gives every target-reading plugin the browser
 * targets it was configured with. A symbol keeps them out of the plugin
 * options a user writes, so only a preset can set them.
 */
export declare const browserTargets: unique symbol;
/**
 * The targets when the user states no preference: browsers that support
 * every Baseline widely available feature, plus the browsers built on their
 * engines.
 */
export declare const defaultTargetsQuery = "baseline widely available with downstream";
/**
 * How many distinct target lists keep a shared copy. A build uses one or a
 * few; the bound keeps a long-running process that receives many queries
 * from holding every list it has seen.
 */
export declare const sharedTargetListLimit = 500;
/**
 * Resolves the targets for one plugin. The preset's targets are the only ones
 * a plugin takes, and the query wins over the project config. The config is
 * searched from the browserslist `path`, else the PostCSS `from` option, and
 * read from the browserslist `config` when that is set. Without a query, the
 * targets are the default ones rather than browserslist's own `defaults`. A
 * query that matches no browser yields an empty list and a warning on the
 * result. Without a result there is no file to share with, so nothing is cached.
 * @param {object} options the plugin options, which may hold a preset's targets
 * @param {Result | undefined} result
 * @param {Browserslist} [browserslist]
 * @return {readonly string[]}
 */
export declare function resolveTargets(options: object, result: Result | undefined, browserslist?: Browserslist): readonly string[];
//# sourceMappingURL=browserTargets.d.ts.map