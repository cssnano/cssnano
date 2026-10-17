export type AdvancedOnlyPluginOptions = {
    /**
     * Discards unused font faces, counter styles, keyframes and namespaces.
     */
    discardUnused?: import('#postcss-discard-unused').Options;
    /**
     * Merges keyframe and counter style names that define the same rules. Takes no options.
     */
    mergeIdents?: Record<string, never>;
    /**
     * Shortens custom identifiers, such as keyframe and counter style names.
     */
    reduceIdents?: import('#postcss-reduce-idents').Options;
    /**
     * Reduces z-index values to small integers that keep their order.
     */
    zindex?: import('#postcss-zindex').Options;
};
export type AdvancedPluginOptions = import('./defaultPlugins.js').DefaultPluginOptions & AdvancedOnlyPluginOptions;
/**
 * The options of the plugins that only the advanced preset adds.
 * @typedef {object} AdvancedOnlyPluginOptions
 * @property {import('#postcss-discard-unused').Options} [discardUnused] Discards unused font faces, counter styles, keyframes and namespaces.
 * @property {Record<string, never>} [mergeIdents] Merges keyframe and counter style names that define the same rules. Takes no options.
 * @property {import('#postcss-reduce-idents').Options} [reduceIdents] Shortens custom identifiers, such as keyframe and counter style names.
 * @property {import('#postcss-zindex').Options} [zindex] Reduces z-index values to small integers that keep their order.
 */
/**
 * The options of each plugin in the advanced preset: the default preset's, then
 * the advanced plugins'.
 * @typedef {import('./defaultPlugins.js').DefaultPluginOptions & AdvancedOnlyPluginOptions} AdvancedPluginOptions
 */
/**
 * The plugins the advanced preset adds to the default ones, each with the
 * preset option that enables it.
 */
export declare const advancedPluginEntries: readonly [readonly [{
    (opts: import("#postcss-discard-unused").Options): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'discardUnused', {
    readonly postcssPlugin: 'postcss-discard-unused';
    readonly optionKeys: readonly ['fontFace', 'counterStyle', 'keyframes', 'namespace'];
}], readonly [{
    (): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'mergeIdents', {
    readonly postcssPlugin: 'postcss-merge-idents';
    readonly optionKeys: readonly [];
}], readonly [{
    ({ counter, counterStyle, keyframes, gridTemplate, encoder, }?: import("#postcss-reduce-idents").Options): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'reduceIdents', {
    readonly postcssPlugin: 'postcss-reduce-idents';
    readonly optionKeys: readonly ['counter', 'counterStyle', 'keyframes', 'gridTemplate', 'encoder'];
}], readonly [{
    (opts?: import("#postcss-zindex").Options): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'zindex', {
    readonly postcssPlugin: 'postcss-zindex';
    readonly optionKeys: readonly ['startIndex'];
}]];
/**
 * Every plugin the advanced preset runs: the default ones, then the advanced ones.
 * It is built once, so the preset and the option validation share the list.
 * @type {readonly import('./configurePlugins.js').PluginEntry[]}
 */
export declare const advancedPresetEntries: readonly import('./configurePlugins.js').PluginEntry[];
//# sourceMappingURL=advancedPlugins.d.ts.map