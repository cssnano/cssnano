import type { SymbolTransform } from '../pipeline/host.js';
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
/** @import {EntryFor} from './configurePlugins.js' */
/** @import {SymbolTransform} from '../pipeline/host.js' */
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
 * preset option that enables it. Referenced only by the type tests.
 *
 * @lintignore
 */
export declare const advancedPluginEntries: readonly [[{
    create: (
    /** @type {import('#postcss-discard-unused').Options} */ options: import('#postcss-discard-unused').Options) => import("#postcss-discard-unused").Options;
}, "discardUnused", {
    optionKeys: ("counterStyle" | "fontFace" | "keyframes" | "namespace")[];
    transform: true;
    symbols: SymbolTransform;
}], [{
    create: (/** @type {Record<string, never>} */ options: Record<string, never>) => Record<string, never>;
}, "mergeIdents", {
    optionKeys: never[];
    transform: true;
    symbols: SymbolTransform;
}], [{
    create: (
    /** @type {import('#postcss-reduce-idents').Options} */ options: import('#postcss-reduce-idents').Options) => {
        reducers: import("#postcss-reduce-idents").Reducer[];
    };
}, "reduceIdents", {
    optionKeys: ("counter" | "counterStyle" | "encoder" | "gridTemplate" | "keyframes")[];
    transform: true;
    symbols: SymbolTransform;
}], [{
    create: (/** @type {import('#postcss-zindex').Options} */ options: import('#postcss-zindex').Options) => import("#postcss-zindex").Options;
}, "zindex", {
    optionKeys: "startIndex"[];
    transform: true;
    symbols: SymbolTransform;
}]];
/**
 * Every plugin the advanced preset runs: the default ones, then the advanced ones.
 * It is built once, so the preset and the option validation share the list.
 * @type {readonly import('./configurePlugins.js').PluginEntry[]}
 */
export declare const advancedPresetEntries: readonly import('./configurePlugins.js').PluginEntry[];
//# sourceMappingURL=advancedPlugins.d.ts.map