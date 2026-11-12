import type { CSSToken } from '@csstools/css-tokenizer';
/**
 * Whether a value, as its tokens spell it, holds an important comment. The
 * longhand rounds keep such a declaration as written: they neither rewrite,
 * remove nor fold it, and no shorthand merges across it.
 *
 * @param {readonly CSSToken[]} tokens the tokens of the value as written
 * @return {boolean}
 */
export declare function holdsImportantComment(tokens: readonly CSSToken[]): boolean;
//# sourceMappingURL=holdsImportantComment.d.ts.map