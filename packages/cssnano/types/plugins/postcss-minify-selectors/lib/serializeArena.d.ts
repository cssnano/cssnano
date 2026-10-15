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
//# sourceMappingURL=serializeArena.d.ts.map