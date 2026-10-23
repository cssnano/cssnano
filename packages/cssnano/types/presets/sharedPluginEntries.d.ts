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
}];
export declare const discardEmptyEntry: readonly [{
    (): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'discardEmpty', {
    readonly postcssPlugin: 'postcss-discard-empty';
    readonly optionKeys: readonly [];
}];
export declare const rawCacheEntry: readonly [typeof import("../utils/rawCache.js").default, 'rawCache', {
    readonly postcssPlugin: 'cssnano-util-raw-cache';
    readonly optionKeys: readonly [];
}];
//# sourceMappingURL=sharedPluginEntries.d.ts.map