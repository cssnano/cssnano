/**
 * The lowercased CSS length unit of a single-token dimension, or null when
 * the term is not a dimension with a length unit.
 *
 * @param {import('./tokenize.js').Term} term
 * @return {string | null}
 */
export declare function lengthUnit(term: import('./tokenize.js').Term): string | null;
/**
 * A syntactically sound <length> component: a dimension carrying a CSS
 * length unit, or the unitless zero number.
 *
 * @param {import('./tokenize.js').Term} term
 * @return {boolean}
 */
export declare function isLength(term: import('./tokenize.js').Term): boolean;
/**
 * Resolve a math function's dimension in a <length> context. Only expressions
 * that resolve to a length match; number results, other dimensions, and
 * malformed or vendor-prefixed arithmetic fail closed so invalid CSS is left
 * byte-for-byte unchanged.
 *
 * @param {import('./tokenize.js').Term} node
 * @return {'length' | null}
 */
export declare function classifyMathLength(node: import('./tokenize.js').Term): 'length' | null;
//# sourceMappingURL=isLength.d.ts.map