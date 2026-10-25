import type { CSSToken } from '@csstools/css-tokenizer';
export type SelectorArena = import('./arena.js').SelectorArena;
export type ArenaNode = import('./arena.js').ArenaNode;
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').ArenaNode} ArenaNode */
/**
 * The tokens of fixed punctuation texts. A text's tokens depend only on the
 * text, so the pool, which interns outputs by text, can attach them once.
 */
export declare const fixedTokens: Map<string, readonly CSSToken[]>;
/**
 * The tokens that spell a class or ID selector's text. A name keeps its
 * source tokens unless its serialized text drops a hex escape terminator.
 * @param {SelectorArena} arena
 * @param {ArenaNode} node
 * @return {readonly CSSToken[]}
 */
export declare function classOrIdTokens(arena: SelectorArena, node: ArenaNode): readonly CSSToken[];
//# sourceMappingURL=outputTokens.d.ts.map