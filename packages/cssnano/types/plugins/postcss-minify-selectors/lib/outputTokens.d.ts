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
/**
 * The token of a name: its source token while the text is unchanged, or else
 * an identifier that spells the text. Only a dropped hex escape terminator
 * changes an identifier's text.
 * @param {CSSToken} token
 * @param {string} text the name's serialized text
 * @return {CSSToken}
 */
export declare function nameToken(token: CSSToken, text: string): CSSToken;
/**
 * The tokens of a namespace prefix, which spell `|`, `*|` or `ns|`.
 * @param {SelectorArena} arena
 * @param {import('./arena.js').AttributePayload['namespace']} namespace
 * @return {CSSToken[]}
 */
export declare function namespaceTokens(arena: SelectorArena, namespace: import('./arena.js').AttributePayload['namespace']): CSSToken[];
/**
 * The token of an attribute value as serialized. An identifier keeps its
 * token. A string keeps its token while its text is unchanged; a value that
 * was unquoted is an identifier, and a quoted value whose text changed is a
 * string with the same decoded value.
 * @param {CSSToken} token the source value token
 * @param {string} text the serialized value
 * @return {CSSToken | undefined}
 */
export declare function attributeValueToken(token: CSSToken, text: string): CSSToken | undefined;
//# sourceMappingURL=outputTokens.d.ts.map