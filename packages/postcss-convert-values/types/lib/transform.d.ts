export type Options = import('./findReplacements.js').Options;
/** @param {Options} opts @param {boolean | string[]} supportsIE @param {import('postcss').Declaration} decl @param {Map<string, string>} [cache] @return {void} */
export default function transform(opts: Options, supportsIE: boolean | string[], decl: import('postcss').Declaration, cache?: Map<string, string>): void;
//# sourceMappingURL=transform.d.ts.map