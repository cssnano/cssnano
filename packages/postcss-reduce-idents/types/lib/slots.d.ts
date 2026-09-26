/**
 * Return the name the generated data knows a property by: collapse prefixed
 * spellings onto the property they alias, and drop a prefix webref has no
 * alias for.
 *
 * @param {string} prop
 * @return {string}
 */
export declare function resolveProperty(prop: string): string;
/**
 * The same, for at-rules: `@-webkit-keyframes` is `keyframes`.
 *
 * @param {string} name
 * @return {string}
 */
export declare function resolveAtRule(name: string): string;
export declare const cssWideKeywords: string[];
export declare const predefinedCounterStyles: string[];
export declare const keyframes: {
    atRule: string;
    properties: Set<string>;
    /** Keywords an `animation` value holds that are not a keyframes name. */
    reservedKeywords: string[];
};
export declare const counterStyle: {
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
export declare const counter: {
    /** Properties that define a counter. */
    properties: Set<string>;
    /** Properties whose value can reference one inside a function. */
    functionProperties: Set<string>;
    /** Function to the arguments of it that name a counter. */
    functions: Map<string, number[]>;
    /** Keywords a counter value holds that are not a counter name. */
    reservedKeywords: string[];
};
export declare const grid: {
    /** Properties that define gridline and grid area names. */
    templateProperties: Set<string>;
    /** Properties that place an item against those names. */
    referenceProperties: Set<string>;
    /** Keywords a grid value holds that are not a line or area name. */
    reservedKeywords: string[];
};
/**
 * Union every function slot a reducer can rename a name in: a name written
 * there is defined by some grammar, so a reducer may rewrite it and it is
 * not opaque. Merge argument lists instead of overwriting entries, since the
 * maps disagree about which slots a function names.
 */
export declare const knownFunctions: Map<any, any>;
//# sourceMappingURL=slots.d.ts.map