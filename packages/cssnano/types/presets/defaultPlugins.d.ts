import mergePass from '../passes/merge/index.js';
export type DefaultPluginOptions = {
    /**
     * Removes comments. Comments marked as important (`/*!`) stay unless `removeAll` is set.
     */
    discardComments?: import('#postcss-discard-comments').Options;
    /**
     * Shortens gradient parameters. Takes no options.
     */
    minifyGradients?: Record<string, never>;
    /**
     * Replaces the `initial` keyword with the property's actual initial value, where possible.
     */
    reduceInitial?: import('#postcss-reduce-initial').Options;
    /**
     * Normalizes display values. Takes no options.
     */
    normalizeDisplayValues?: Record<string, never>;
    /**
     * Reduces transform functions to shorter equivalent forms. Takes no options.
     */
    reduceTransforms?: Record<string, never>;
    /**
     * Shortens colors to the shortest form that the browser targets support.
     */
    colormin?: import('#postcss-colormin').Options;
    /**
     * Normalizes timing functions to shorter equivalent forms. Takes no options.
     */
    normalizeTimingFunctions?: Record<string, never>;
    /**
     * Reduces `calc()` expressions whose result is known.
     */
    calc?: import('postcss-calc').PostCssCalcOptions;
    /**
     * Converts units to shorter equivalents, such as `ms` to `s`. The preset sets `length: false`.
     */
    convertValues?: import('#postcss-convert-values').Options;
    /**
     * Orders the values of shorthand properties consistently. Takes no options.
     */
    orderedValues?: Record<string, never>;
    /**
     * Minifies selectors. The default options sort them and factor shared parts into `:is()`.
     */
    minifySelectors?: import('#postcss-minify-selectors').Options;
    /**
     * Minifies at-rule parameters. Takes no options.
     */
    minifyParams?: import('#postcss-minify-params').Options;
    /**
     * Adds a `@charset` for files with non-ASCII characters. The preset sets `add: false`.
     */
    normalizeCharset?: import('#postcss-normalize-charset').Options;
    /**
     * Discards declarations that a later declaration overrides. Takes no options.
     */
    discardOverridden?: Record<string, never>;
    /**
     * Normalizes string quotes to the preferred quote, double by default.
     */
    normalizeString?: import('#postcss-normalize-string').Options;
    /**
     * Normalizes `unicode-range` values. Takes no options.
     */
    normalizeUnicode?: import('#postcss-normalize-unicode').Options;
    /**
     * Minifies `font` and `font-family` values.
     */
    minifyFontValues?: import('#postcss-minify-font-values').Options;
    /**
     * Normalizes `url()` values. Takes no options.
     */
    normalizeUrl?: Record<string, never>;
    /**
     * Shortens `background-repeat` values, such as `repeat no-repeat` to `repeat-x`. Takes no options.
     */
    normalizeRepeatStyle?: Record<string, never>;
    /**
     * Shortens position values. Takes no options.
     */
    normalizePositions?: Record<string, never>;
    /**
     * Removes whitespace and line breaks that are not needed. Takes no options.
     */
    normalizeWhitespace?: Record<string, never>;
    /**
     * Merges longhand properties into shorthands that the browser targets support, discards duplicate rules and merges rules that share a selector or declaration. Set `rules` to false to keep rules apart.
     */
    merge?: {
        rules?: boolean;
    };
    /**
     * Discards empty rules and declarations. Takes no options.
     */
    discardEmpty?: Record<string, never>;
    /**
     * Removes duplicate selectors from a selector list. Takes no options.
     */
    uniqueSelectors?: Record<string, never>;
    /**
     * Records the raw formatting of the output on the root, for later plugins to reuse. Takes no options.
     */
    rawCache?: Record<string, never>;
};
/**
 * The plugins of the default preset, in the order they run, each with the
 * preset option that enables it and the settings it runs with.
 */
export declare const defaultPluginEntries: readonly [readonly [{
    (opts?: import("#postcss-discard-comments").Options): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, "discardComments", {
    readonly postcssPlugin: 'postcss-discard-comments';
    readonly optionKeys: readonly ['removeAll', 'removeAllButFirst', 'remove'];
}], readonly [{
    create: () => {
        forProperty: () => (buffer: import("../values/valueBuffer.js").ValueBuffer) => void;
    };
}, 'minifyGradients', {
    readonly postcssPlugin: 'postcss-minify-gradients';
    readonly optionKeys: readonly [];
}], readonly [{
    create: (options: import("#postcss-reduce-initial").Options, browsers: readonly string[] | undefined) => import("../pipeline/host.js").Stage | null;
}, 'reduceInitial', {
    readonly postcssPlugin: 'postcss-reduce-initial';
    readonly targets: true;
    readonly optionKeys: readonly ['ignore'];
}], readonly [{
    create: () => import("../pipeline/host.js").Stage;
}, 'normalizeDisplayValues', {
    readonly postcssPlugin: 'postcss-normalize-display-values';
    readonly optionKeys: readonly [];
}], readonly [{
    create: () => import("../pipeline/host.js").Stage;
}, 'reduceTransforms', {
    readonly postcssPlugin: 'postcss-reduce-transforms';
    readonly optionKeys: readonly [];
}], readonly [{
    create: (config: import("#postcss-colormin").Options, browsers: readonly string[] | undefined) => import("../pipeline/host.js").Stage;
}, 'colormin', {
    readonly postcssPlugin: 'postcss-colormin';
    readonly targets: true;
    readonly optionKeys: readonly ['hex', 'alphaHex', 'rgb', 'hsl', 'name', 'transparent', 'transformCustomProperties'];
}], readonly [{
    create: () => import("../pipeline/host.js").Stage;
}, 'normalizeTimingFunctions', {
    readonly postcssPlugin: 'postcss-normalize-timing-functions';
    readonly optionKeys: readonly [];
}], readonly [{
    create: (options: import("postcss-calc").PostCssCalcOptions) => import("../pipeline/host.js").Stage;
}, 'calc', {
    readonly postcssPlugin: 'postcss-calc';
    readonly optionKeys: readonly ['precision', 'warnWhenCannotResolve', 'mediaQueries', 'selectors', 'unwrapSingleValue', 'onParseError'];
}], readonly [{
    create: (options: import("#postcss-convert-values").Options, browsers: readonly string[] | undefined) => import("../pipeline/host.js").Stage;
}, 'convertValues', {
    readonly postcssPlugin: 'postcss-convert-values';
    readonly targets: true;
    readonly defaults: {
        readonly length: false;
    };
    readonly optionKeys: readonly ['precision', 'transformCustomProperties', 'time', 'length', 'angle', 'frequency'];
}], readonly [{
    (): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'orderedValues', {
    readonly postcssPlugin: 'postcss-ordered-values';
    readonly optionKeys: readonly [];
}], readonly [{
    (opts?: import("#postcss-minify-selectors").Options): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'minifySelectors', {
    readonly postcssPlugin: 'postcss-minify-selectors';
    readonly targets: true;
    readonly defaults: {
        readonly sort: true;
    };
    readonly optionKeys: readonly ['sort', 'convertToIs'];
}], readonly [{
    (options?: import("#postcss-minify-params").Options): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'minifyParams', {
    readonly postcssPlugin: 'postcss-minify-params';
    readonly targets: true;
    readonly optionKeys: readonly [];
}], readonly [{
    (opts?: import("#postcss-normalize-charset").Options): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'normalizeCharset', {
    readonly postcssPlugin: 'postcss-normalize-charset';
    readonly defaults: {
        readonly add: false;
    };
    readonly optionKeys: readonly ['add'];
}], readonly [{
    (): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'discardOverridden', {
    readonly postcssPlugin: 'postcss-discard-overridden';
    readonly optionKeys: readonly [];
}], readonly [{
    (opts: import("#postcss-normalize-string").Options): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'normalizeString', {
    readonly postcssPlugin: 'postcss-normalize-string';
    readonly optionKeys: readonly ['preferredQuote'];
}], readonly [{
    (opts?: import("#postcss-normalize-unicode").Options): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'normalizeUnicode', {
    readonly postcssPlugin: 'postcss-normalize-unicode';
    readonly targets: true;
    readonly optionKeys: readonly [];
}], readonly [{
    (opts: import("#postcss-minify-font-values").Options): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'minifyFontValues', {
    readonly postcssPlugin: 'postcss-minify-font-values';
    readonly optionKeys: readonly ['removeAfterKeyword', 'removeDuplicates', 'removeQuotes'];
}], readonly [{
    (): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'normalizeUrl', {
    readonly postcssPlugin: 'postcss-normalize-url';
    readonly optionKeys: readonly [];
}], readonly [{
    create: () => import("../pipeline/host.js").Stage;
}, 'normalizeRepeatStyle', {
    readonly postcssPlugin: 'postcss-normalize-repeat-style';
    readonly optionKeys: readonly [];
}], readonly [{
    (): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'normalizePositions', {
    readonly postcssPlugin: 'postcss-normalize-positions';
    readonly optionKeys: readonly [];
}], readonly [{
    (): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, "normalizeWhitespace", {
    readonly postcssPlugin: 'postcss-normalize-whitespace';
    readonly optionKeys: readonly [];
}], readonly [typeof mergePass, "merge", {
    readonly postcssPlugin: 'cssnano-merge';
    readonly targets: true;
    readonly optionKeys: readonly ['rules'];
    readonly guards: {
        readonly rules: Readonly<{
            isValid: typeof import("../optionGuards.js").isBoolean;
            expected: "a boolean";
        }>;
    };
}], readonly [{
    (): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, "discardEmpty", {
    readonly postcssPlugin: 'postcss-discard-empty';
    readonly optionKeys: readonly [];
}], readonly [{
    (): import("postcss/lib/postcss").Plugin;
    postcss: true;
}, 'uniqueSelectors', {
    readonly postcssPlugin: 'postcss-unique-selectors';
    readonly optionKeys: readonly [];
}], readonly [typeof import("../utils/rawCache.js").default, "rawCache", {
    readonly postcssPlugin: 'cssnano-util-raw-cache';
    readonly optionKeys: readonly [];
}]];
//# sourceMappingURL=defaultPlugins.d.ts.map