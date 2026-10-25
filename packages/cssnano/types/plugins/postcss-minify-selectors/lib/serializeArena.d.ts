import type { CSSToken } from '@csstools/css-tokenizer';
export type SelectorArena = import('./arena.js').SelectorArena;
export type Emit = import('./outputOverlay.js').Emit;
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