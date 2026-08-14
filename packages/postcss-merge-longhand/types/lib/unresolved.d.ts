declare const _exports: {
    isUnresolved: typeof isUnresolved;
    substitutionFunctions: string[];
    trustedFunctions: Set<string>;
};
export = _exports;
/**
 * Whether a token represents an unresolved value this plugin cannot compute.
 *
 * Only the leading function determines this: var(--x, rgba(0,0,0,.5)) will
 * substitute a user-agent-computed value, so we cannot infer its type from the
 * fallback. Accepting all bracketed tokens instead would allow any function to
 * represent any type—padding-top: url(x) becomes a length, border-top-width:
 * rgb(0 0 0) a width—and user agents ignore both invalid declarations, so
 * merging them produces invalid shorthands.
 *
 * @param {string} token
 * @return {boolean}
 */
declare function isUnresolved(token: string): boolean;
//# sourceMappingURL=unresolved.d.ts.map