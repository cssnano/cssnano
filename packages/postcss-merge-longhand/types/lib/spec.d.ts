declare const _exports: {
    /** The sides of the box, in the order a shorthand lists them. */
    sides: string[];
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
//# sourceMappingURL=spec.d.ts.map