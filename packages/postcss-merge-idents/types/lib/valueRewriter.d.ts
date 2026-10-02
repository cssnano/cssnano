export type Replacement = {
    text: string;
    isString: boolean;
    absorbsWhitespace: boolean;
};
export type Edit = {
    start: number;
    end: number;
    text: string;
};
export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
export type Visitor = (token: CSSToken, frame: import('./valueWalk.js').NestingFrame | undefined, index: number) => Edit | undefined;
/**
 * @typedef {{ text: string, isString: boolean, absorbsWhitespace: boolean }} Replacement
 * @typedef {{ start: number, end: number, text: string }} Edit
 * @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken
 * @typedef {(token: CSSToken, frame: import('./valueWalk.js').NestingFrame | undefined, index: number) => Edit | undefined} Visitor
 */
/**
 * Prepares the spelling that references to a renamed name receive. A name
 * ending in an unterminated hex escape, e.g. `\61`, absorbs a following space
 * and would swallow the next component, so edits must know whether to
 * terminate it. A name that already includes its terminating space, or ends in
 * an escaped space, absorbs nothing.
 *
 * @param {{ isString: boolean, tokenText: string }} target the target's
 *   at-rule name
 * @return {Replacement}
 */
declare function createReplacement({ isString, tokenText }: {
    isString: boolean;
    tokenText: string;
}): Replacement;
/**
 * Rewrites the names a declaration references. An ident and a string with the
 * same value are one name, and a renamed name is rewritten wherever it is
 * referenced because only interchangeable names are ever renamed.
 *
 * @param {import('postcss').Declaration} decl
 * @param {NonNullable<ReturnType<typeof import('./grammar.js').classifyDeclaration>>['kind']} kind
 * @param {Map<string, Replacement>} renames old name → replacement
 * @param {string} value the declaration value, with the whitespace that a
 *   trailing escape consumed restored
 * @return {void}
 */
declare function rewriteDeclaration(decl: import('postcss').Declaration, kind: NonNullable<ReturnType<typeof import('./grammar.js').classifyDeclaration>>['kind'], renames: Map<string, Replacement>, value: string): void;
export { createReplacement, rewriteDeclaration };
//# sourceMappingURL=valueRewriter.d.ts.map