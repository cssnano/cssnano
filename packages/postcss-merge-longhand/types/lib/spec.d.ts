declare const _exports: {
    /** The sides of the box, in the order a shorthand lists them. */
    sides: string[];
    setsLonghands: typeof setsLonghands;
    /** The parts of a border, in the order `border` lists them. */
    borderComponents: string[];
    shorthand: typeof shorthand;
    initialValues: Map<string, string>;
    borderProperties: Set<string>;
    flowRelativeBorderProperties: Set<string>;
    cssWideKeywords: Set<string>;
    lineStyles: Set<string>;
    lineWidthKeywords: Set<string>;
    namedColors: Set<string>;
    colorFunctions: Set<string>;
};
export = _exports;
/**
 * @param {string} name
 * @return {{longhands: string[], resets: string[]}}
 */
declare function shorthand(name: string): {
    longhands: string[];
    resets: string[];
};
/**
 * All properties set when applying a shorthand: recursively follows each
 * shorthand through its named longhands and implicit resets. A property that
 * the generated data does not list as a shorthand sets only itself.
 *
 * Longhands often collide despite dissimilar names: `border-top` and
 * `border-color` both set `border-top-color` without any name overlap;
 * `border` and `border-image-source` collide despite sharing no segments.
 * Such collisions cannot be detected from property names alone.
 *
 * @param {string} name lower-cased
 * @return {Set<string>}
 */
declare function setsLonghands(name: string): Set<string>;
//# sourceMappingURL=spec.d.ts.map