export type LitePluginOptions = Pick<import('./defaultPlugins.js').DefaultPluginOptions, 'discardComments' | 'normalizeWhitespace' | 'discardEmpty' | 'rawCache'>;
/**
 * The options of each plugin in the lite preset. They are the default preset's
 * options for the plugins they share, so the settings of a plugin cannot differ.
 * @typedef {Pick<import('./defaultPlugins.js').DefaultPluginOptions, 'discardComments' | 'normalizeWhitespace' | 'discardEmpty' | 'rawCache'>} LitePluginOptions
 */
/**
 * The plugins of the lite preset, in the order they run, each with the
 * preset option that enables it.
 */
export declare const litePluginEntries: readonly [readonly [import("../pipeline/host.js").StageEntry, "discardComments", {
    readonly postcssPlugin: 'postcss-discard-comments';
    readonly optionKeys: readonly ['removeAll', 'removeAllButFirst', 'remove'];
}], readonly [{
    (): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, "normalizeWhitespace", {
    readonly postcssPlugin: 'postcss-normalize-whitespace';
    readonly optionKeys: readonly [];
    readonly stage: {
        create: () => import("../pipeline/host.js").Stage;
    };
    readonly walk: true;
}], readonly [{
    readonly create: (options: Record<PropertyKey, unknown>) => Record<PropertyKey, unknown>;
}, "discardEmpty", {
    readonly postcssPlugin: 'postcss-discard-empty';
    readonly optionKeys: readonly [];
    readonly transform: true;
    readonly pass: (css: import('postcss').Root, browsers: readonly string[], options: Record<PropertyKey, unknown>, result: import('postcss').Result) => void;
}], readonly [{
    readonly create: (options: Record<PropertyKey, unknown>) => Record<PropertyKey, unknown>;
}, "rawCache", {
    readonly postcssPlugin: 'cssnano-util-raw-cache';
    readonly optionKeys: readonly [];
    readonly transform: true;
    readonly pass: (css: import('postcss').Root, browsers: readonly string[], options: Record<PropertyKey, unknown>, result: import('postcss').Result) => void;
}]];
//# sourceMappingURL=litePlugins.d.ts.map