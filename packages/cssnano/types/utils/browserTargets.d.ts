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
export type Browserslist = ((query: SharedTargets['query'], options: Omit<SharedTargets, 'query'>) => string[]) & {
    loadConfig: (options: Pick<SharedTargets, 'path' | 'env' | 'config'>) => string | string[] | undefined;
};
/** @import {Result} from 'postcss' */
/**
 * The browser targets of one run, which the run plan names. The fields are the
 * options of browserslist; an unset one is left to browserslist.
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
 * @typedef {((query: SharedTargets['query'], options: Omit<SharedTargets, 'query'>) => string[]) & {loadConfig: (options: Pick<SharedTargets, 'path' | 'env' | 'config'>) => string | string[] | undefined}} Browserslist
 */
/**
 * The targets when the user states no preference: browsers that support
 * every feature Baseline widely available on the release date, plus the
 * browsers built on their engines. The fixed date keeps a release's output
 * the same whenever it runs; each release moves it on deliberately.
 */
export declare const defaultTargetsQuery = "baseline widely available on 2026-11-30 with downstream";
/**
 * How many distinct target lists keep a shared copy. A build uses one or a
 * few; the bound keeps a long-running process that receives many queries
 * from holding every list it has seen.
 */
export declare const sharedTargetListLimit = 500;
/**
 * Resolves the targets of a run. The query wins over the project config. The
 * config is searched from the browserslist `path`, else the PostCSS `from`
 * option, and read from the browserslist `config` when that is set. Without a
 * query, the targets are the default ones rather than browserslist's own
 * `defaults`. A query that matches no browser yields an empty list and a
 * warning on the result. The env and stats are the ones the shared targets set,
 * never the PostCSS process options. Each call resolves again; a host plugin
 * resolves once per file.
 * @param {SharedTargets | undefined} shared the browser targets of the run, which may be unset
 * @param {Result | undefined} result
 * @param {Browserslist} [browserslist]
 * @return {readonly string[]}
 */
export declare function resolveTargets(shared: SharedTargets | undefined, result: Result | undefined, browserslist?: Browserslist): readonly string[];
//# sourceMappingURL=browserTargets.d.ts.map