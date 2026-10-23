/**
 * The plugin entries that more than one built-in preset runs. Each is defined
 * once, so the settings of an option cannot differ between presets.
 */
export declare const discardCommentsEntry: readonly [import("../pipeline/host.js").StageEntry, 'discardComments', {
    readonly postcssPlugin: 'postcss-discard-comments';
    readonly optionKeys: readonly ['removeAll', 'removeAllButFirst', 'remove'];
}];
export declare const normalizeWhitespaceEntry: readonly [{
    create: () => import("../pipeline/host.js").Stage;
}, 'normalizeWhitespace', {
    readonly postcssPlugin: 'postcss-normalize-whitespace';
    readonly optionKeys: readonly [];
    readonly walk: true;
    readonly after: true;
}];
/**
 * discardEmpty runs in the walk after merge of its host, so the host walks the
 * stylesheet without a plugin of its own.
 */
export declare const discardEmptyEntry: readonly [{
    readonly create: (/** @type {Record<PropertyKey, unknown>} */ options: Record<PropertyKey, unknown>) => Record<PropertyKey, unknown>;
}, 'discardEmpty', {
    readonly postcssPlugin: 'postcss-discard-empty';
    readonly optionKeys: readonly [];
    readonly transform: true;
    readonly after: true;
}];
/**
 * rawCache runs last in the walk after merge of its host.
 */
export declare const rawCacheEntry: readonly [{
    readonly create: (/** @type {Record<PropertyKey, unknown>} */ options: Record<PropertyKey, unknown>) => Record<PropertyKey, unknown>;
}, 'rawCache', {
    readonly postcssPlugin: 'cssnano-util-raw-cache';
    readonly optionKeys: readonly [];
    readonly transform: true;
    readonly after: true;
}];
//# sourceMappingURL=sharedPluginEntries.d.ts.map