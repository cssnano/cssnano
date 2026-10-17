import type { TargetOptions } from './index.js';
import type { Result } from 'postcss';
export type Browserslist = ((query: TargetOptions['overrideBrowserslist'], options: {
    stats?: TargetOptions['stats'];
    path?: string;
    env?: string;
}) => string[]) & {
    loadConfig: (options: {
        path?: string;
        env?: string;
    }) => string | string[] | undefined;
};
/** @import {TargetOptions} from './index.js' */
/** @import {Result} from 'postcss' */
/**
 * @typedef {((query: TargetOptions['overrideBrowserslist'], options: {stats?: TargetOptions['stats'], path?: string, env?: string}) => string[]) & {loadConfig: (options: {path?: string, env?: string}) => string | string[] | undefined}} Browserslist
 */
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
 * Resolves the targets for one plugin, with the same option precedence as
 * browserslist: plugin options win over the postcss options, and the override
 * query wins over the project config. Without either, the targets are the
 * default ones rather than browserslist's own `defaults`. A query that
 * matches no browser yields an empty list and a warning on the result.
 * Without a result there is no file to share with, so nothing is cached.
 * @param {TargetOptions} options
 * @param {Result | undefined} result
 * @param {Browserslist} [browserslist]
 * @return {readonly string[]}
 */
export declare function resolveTargets(options: TargetOptions, result: Result | undefined, browserslist?: Browserslist): readonly string[];
//# sourceMappingURL=browserTargets.d.ts.map