/**
 * The plugin entries that more than one built-in preset runs. Each is defined
 * once, so the settings of an option cannot differ between presets.
 */
export declare const discardCommentsEntry: readonly [import("../pipeline/host.js").StageEntry, 'discardComments', {
    readonly postcssPlugin: 'postcss-discard-comments';
    readonly optionKeys: readonly ['removeAll', 'removeAllButFirst', 'remove'];
}];
export declare const normalizeWhitespaceEntry: readonly [{
    (): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'normalizeWhitespace', {
    readonly postcssPlugin: 'postcss-normalize-whitespace';
    readonly optionKeys: readonly [];
    readonly stage: {
        create: () => import("../pipeline/host.js").Stage;
    };
    readonly walk: true;
}];
/**
 * discardEmpty runs as a pass of its host, after the merge pass, so the host
 * walks the stylesheet without a plugin of its own.
 */
export declare const discardEmptyEntry: readonly [{
    readonly create: (/** @type {Record<PropertyKey, unknown>} */ options: Record<PropertyKey, unknown>) => Record<PropertyKey, unknown>;
}, 'discardEmpty', {
    readonly postcssPlugin: 'postcss-discard-empty';
    readonly optionKeys: readonly [];
    readonly transform: true;
    readonly pass: (css: import('postcss').Root, browsers: readonly string[], options: Record<PropertyKey, unknown>, result: import('postcss').Result) => void;
}];
export declare const rawCacheEntry: readonly [typeof import("../utils/rawCache.js").default, 'rawCache', {
    readonly postcssPlugin: 'cssnano-util-raw-cache';
    readonly optionKeys: readonly [];
}];
//# sourceMappingURL=sharedPluginEntries.d.ts.map