import type { Declaration } from 'postcss';
/**
 * Whether a declaration carries a browser hack. The merge pass's longhand
 * transform uses it to keep hacked declarations out of shorthands, because the
 * hack is invalid for every browser that cssnano supports. Answers are cached
 * because the longhand transform asks about the same declarations many times;
 * an entry is reused only while the inputs it read are unchanged.
 * @param {Declaration} declaration
 * @return {boolean}
 */
export declare function detectDeclaration(declaration: Declaration): boolean;
//# sourceMappingURL=index.d.ts.map