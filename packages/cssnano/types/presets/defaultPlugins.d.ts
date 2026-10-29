/** @import {EntryFor} from './configurePlugins.js' */
import { mergePass } from '../passes/merge/index.js';
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
    create(options: import("#postcss-discard-comments").Options): {
        comments(): (text: string) => boolean;
    };
}, "discardComments", {
    readonly optionKeys: readonly ["removeAll", "removeAllButFirst", "remove"];
}], [{
    create: () => {
        forProperty: () => (buffer: import("../values/valueBuffer.js").ValueBuffer) => void;
    };
}, "minifyGradients", {
    optionKeys: never[];
}], [{
    create: (options: import("#postcss-reduce-initial").Options, browsers: readonly string[] | undefined) => import("../pipeline/host.js").Stage | null;
}, "reduceInitial", {
    targets: true;
    optionKeys: "ignore"[];
}], [{
    create: () => import("../pipeline/host.js").Stage;
}, "normalizeDisplayValues", {
    optionKeys: never[];
}], [{
    create: () => import("../pipeline/host.js").Stage;
}, "reduceTransforms", {
    optionKeys: never[];
}], [{
    create: (config: import("#postcss-colormin").Options, browsers: readonly string[] | undefined) => import("../pipeline/host.js").Stage;
}, "colormin", {
    targets: true;
    optionKeys: ("alphaHex" | "hex" | "hsl" | "name" | "rgb" | "transformCustomProperties" | "transparent")[];
}], [{
    create: () => import("../pipeline/host.js").Stage;
}, "normalizeTimingFunctions", {
    optionKeys: never[];
}], [{
    create: (options: import("postcss-calc").PostCssCalcOptions) => import("../pipeline/host.js").Stage;
}, "calc", {
    optionKeys: ("mediaQueries" | "onParseError" | "precision" | "selectors" | "unwrapSingleValue" | "warnWhenCannotResolve")[];
}], [{
    create: (options: import("#postcss-convert-values").Options, browsers: readonly string[] | undefined) => import("../pipeline/host.js").Stage;
}, "convertValues", {
    targets: true;
    defaults: {
        length: boolean;
    };
    optionKeys: ("angle" | "frequency" | "length" | "precision" | "time" | "transformCustomProperties")[];
}], [{
    create: () => import("../pipeline/host.js").Stage;
}, "orderedValues", {
    optionKeys: never[];
}], [{
    create: (options: import("#postcss-minify-selectors").Options, targets: readonly string[] | undefined) => import("../pipeline/host.js").Stage;
}, "minifySelectors", {
    targets: true;
    defaults: {
        sort: boolean;
    };
    optionKeys: ("convertToIs" | "sort")[];
}], [{
    create: (_options: import("#postcss-minify-params").Options, targets: readonly string[] | undefined) => import("../pipeline/host.js").Stage;
}, "minifyParams", {
    targets: true;
    optionKeys: never[];
}], [{
    create: (
    /** @type {import('#postcss-normalize-charset').Options} */ options: import('#postcss-normalize-charset').Options) => import("#postcss-normalize-charset").Options;
}, "normalizeCharset", {
    defaults: {
        add: boolean;
    };
    optionKeys: "add"[];
    transform: true;
    after: true;
}], [{
    create: (options: import("#postcss-normalize-string").Options) => import("../pipeline/host.js").Stage;
}, "normalizeString", {
    optionKeys: "preferredQuote"[];
}], [{
    create: (options: import("#postcss-normalize-unicode").Options, browsers: readonly string[] | undefined) => import("../pipeline/host.js").Stage;
}, "normalizeUnicode", {
    targets: true;
    optionKeys: never[];
}], [{
    create: (options: import("#postcss-minify-font-values").Options) => import("../pipeline/host.js").Stage;
}, "minifyFontValues", {
    optionKeys: ("removeAfterKeyword" | "removeDuplicates" | "removeQuotes")[];
}], [{
    create: () => import("../pipeline/host.js").Stage;
}, "normalizeUrl", {
    optionKeys: never[];
}], [{
    create: () => import("../pipeline/host.js").Stage;
}, "normalizeRepeatStyle", {
    optionKeys: never[];
}], [{
    create: () => import("../pipeline/host.js").Stage;
}, "normalizePositions", {
    optionKeys: never[];
}], [{
    create: (options: Record<string, never>) => Record<string, never>;
}, "discardOverridden", {
    optionKeys: never[];
    transform: true;
}], readonly [{
    create: () => import("../pipeline/host.js").Stage;
}, "normalizeWhitespace", {
    readonly optionKeys: readonly [];
    readonly walk: true;
    readonly after: true;
}], readonly [{
    readonly create: (/** @type {{rules?: boolean}} */ options: {
        rules?: boolean;
    }) => {
        rules?: boolean;
    };
}, "merge", {
    readonly targets: true;
    readonly transform: true;
    readonly pass: typeof mergePass;
    readonly optionKeys: readonly ["rules"];
    readonly guards: {
        readonly rules: Readonly<{
            isValid: typeof import("../optionGuards.js").isBoolean;
            expected: "a boolean";
        }>;
    };
}], readonly [{
    readonly create: (options: Record<string, never>) => Record<string, never>;
}, "discardEmpty", {
    readonly optionKeys: readonly [];
    readonly transform: true;
    readonly after: true;
}], [{
    create: (/** @type {Record<string, never>} */ options: Record<string, never>) => Record<string, never>;
}, "uniqueSelectors", {
    optionKeys: never[];
    transform: true;
    after: true;
}], readonly [{
    readonly create: (options: Record<string, never>) => Record<string, never>;
}, "rawCache", {
    readonly optionKeys: readonly [];
    readonly transform: true;
    readonly after: true;
}]];
//# sourceMappingURL=defaultPlugins.d.ts.map