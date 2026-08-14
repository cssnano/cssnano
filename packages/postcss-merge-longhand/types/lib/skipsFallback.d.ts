export = _exports;
/**
 * A user agent applies a declaration only if it supports every feature it
 * requires, and applies a shorthand as a whole or not at all, so folding
 * declarations into one shorthand is conforming only when they require the
 * same features — otherwise it reaches just the narrowest audience.
 *
 * @param {import('postcss').Declaration[]} rules
 * @return {boolean}
 */
declare function _exports(rules: import('postcss').Declaration[]): boolean;
//# sourceMappingURL=skipsFallback.d.ts.map