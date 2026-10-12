export type Options = {
    encode?: boolean;
    configFile?: string | boolean;
    cwd?: string;
} & import('svgo').Config;
/**
 * `configFile` is a path to a svgo configuration, or `true` to discover
 * svgo.config.js (or .mjs, .cjs) from `cwd` and its ancestor directories.
 * Inline svgo options take precedence over it.
 * @typedef {{encode?: boolean, configFile?: string | boolean, cwd?: string} & import('svgo').Config} Options
 */
/**
 * @param {Options} options
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(options?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map