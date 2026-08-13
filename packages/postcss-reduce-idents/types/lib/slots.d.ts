declare const _exports: {
    resolveProperty: typeof resolveProperty;
    resolveAtRule: typeof resolveAtRule;
    /** Keywords that are never a custom identifier, whatever the property. */
    cssWideKeywords: string[];
    keyframes: {
        atRule: string;
        properties: Set<string>;
        /** Keywords an `animation` value holds that are not a keyframes name. */
        reservedKeywords: string[];
    };
    counterStyle: {
        atRule: string;
        /** Properties whose value can name a counter style directly. */
        properties: Set<string>;
        /** `@counter-style` descriptors that name another counter style. */
        descriptors: Set<string>;
        /** Properties whose value can name one inside a function. */
        functionProperties: Set<string>;
        /** Function to the arguments of it that name a counter style. */
        functions: Map<string, number[]>;
        /** Keywords a `list-style` value holds that are not a style name. */
        reservedKeywords: string[];
    };
    counter: {
        /** Properties that define a counter. */
        properties: Set<string>;
        /** Properties whose value can reference one inside a function. */
        functionProperties: Set<string>;
        /** Function to the arguments of it that name a counter. */
        functions: Map<string, number[]>;
        /** Keywords a counter value holds that are not a counter name. */
        reservedKeywords: string[];
    };
    grid: {
        /** Properties that define gridline and grid area names. */
        templateProperties: Set<string>;
        /** Properties that place an item against those names. */
        referenceProperties: Set<string>;
        /** Keywords a grid value holds that are not a line or area name. */
        reservedKeywords: string[];
    };
};
export = _exports;
/**
 * The name the generated data knows a property by: vendor prefixed spellings
 * collapse onto the property they alias, and a prefix webref has no alias for
 * is dropped, since `-moz-animation-name` names keyframes just as
 * `animation-name` does.
 *
 * @param {string} prop
 * @return {string}
 */
declare function resolveProperty(prop: string): string;
/**
 * The same, for at-rules: `@-webkit-keyframes` is `keyframes`.
 *
 * @param {string} name
 * @return {string}
 */
declare function resolveAtRule(name: string): string;
//# sourceMappingURL=slots.d.ts.map