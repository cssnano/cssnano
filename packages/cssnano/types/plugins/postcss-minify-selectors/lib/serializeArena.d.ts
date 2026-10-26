import type { CSSToken } from '@csstools/css-tokenizer';
export type SelectorArena = import('./arena.js').SelectorArena;
export type Emit = import('./outputOverlay.js').Emit;
/**
 * The tokenizer keeps a hex escape's terminator in the escape's ident or hash,
 * so a terminator restored before whitespace joins that token's text. Before a
 * hex digit the next emit would continue the ident, which no joined token list
 * can spell.
 * @param {(CSSToken | undefined)[]} list
 * @param {string} next
 */
export declare function appendTerminator(list: (CSSToken | undefined)[], next: string): void;
/**
 * The tokens that spell `joinPieces(pieces)`, joined as `serializeNormalized`
 * joins emits. A piece without a token, or a restored terminator no token can
 * hold, makes the result undefined.
 * @param {readonly string[]} pieces
 * @param {readonly (CSSToken | undefined)[]} tokens the token of each piece
 * @return {readonly CSSToken[] | undefined}
 */
export declare function joinPieceTokens(pieces: readonly string[], tokens: readonly (CSSToken | undefined)[]): readonly CSSToken[] | undefined;
/**
 * Serialize trusted normalizer output, where node emissions always mean an
 * unchanged source-backed subtree. Joining restores hex escape terminators that
 * text emits omit, judged from the bytes that actually follow (see
 * `needsHexEscapeTerminator`).
 * @param {SelectorArena} arena
 * @param {Emit | undefined} root
 */
export declare function serializeNormalized(arena: SelectorArena, root: Emit | undefined): string;
/**
 * The same text as `serializeNormalized`, with its tokens. The tokens are
 * undefined when an emit carries none, so no fragment is tokenized out of
 * context.
 * @param {SelectorArena} arena
 * @param {Emit | undefined} root
 * @return {{text: string, tokens: readonly CSSToken[] | undefined}}
 */
export declare function serializeNormalizedTokens(arena: SelectorArena, root: Emit | undefined): {
    text: string;
    tokens: readonly CSSToken[] | undefined;
};
//# sourceMappingURL=serializeArena.d.ts.map