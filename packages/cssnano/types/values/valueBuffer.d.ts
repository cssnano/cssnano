import { balancedStructure } from '../utils/value.js';
import type { CSSToken } from '@csstools/css-tokenizer';
export type BalancedTokens = NonNullable<ReturnType<typeof balancedStructure>>;
export type TokenizeMode = {
    unicodeRangesAllowed?: boolean;
};
export type TokenEdit = {
    start: number;
    end: number;
    tokens: readonly CSSToken[];
};
/**
 * The working copy of one fold over a declaration value. Reads come from the
 * source text until the first edit. Tokens are built on first use, and an edit
 * builds a new list, so a list a reader holds never changes. After an edit,
 * each token's positions are its offsets in text().
 */
declare class ValueBuffer {
    #private;
    /**
     * @param {string} source the value as the stylesheet reads it
     * @param {TokenizeMode} [mode] how the tokenizer reads the value, such as
     *   with `U+` ranges for `unicode-range`
     * @param {readonly CSSToken[]} [shared] tokens that already spell `source`,
     *   so tokens() returns them without tokenizing until the first edit
     */
    constructor(source: string, mode?: TokenizeMode, shared?: readonly CSSToken[]);
    /**
     * The current text. Before any edit this is the source text.
     *
     * @return {string}
     */
    text(): string;
    /**
     * The current tokens. The list is never mutated, so a reader may keep it
     * across later edits.
     *
     * @return {readonly CSSToken[]}
     */
    tokens(): readonly CSSToken[];
    /**
     * Whether an edit has changed the buffer. Until then, the source text is
     * the text, so a reader may check it without serializing the tokens.
     *
     * @return {boolean}
     */
    isEdited(): boolean;
    /**
     * The bracket structure of the current tokens, or undefined when they are
     * unbalanced.
     *
     * @return {BalancedTokens | undefined}
     */
    structure(): BalancedTokens | undefined;
    /**
     * Replaces the tokens from `start` up to `end`, exclusive, with the given
     * tokens. Indexes refer to the tokens as they are now. Each call costs O(n),
     * so a reducer with several edits uses replaceRanges.
     *
     * @param {number} start
     * @param {number} end
     * @param {readonly CSSToken[]} replacement built with the token constructors
     */
    replace(start: number, end: number, replacement: readonly CSSToken[]): void;
    /**
     * Applies several edits in one pass, O(n + m) for n tokens and m replacement
     * tokens. The result is the same as replace called from last to first. Each
     * edit's indexes refer to the tokens before the call, and the edits are in
     * ascending order without overlap.
     *
     * @param {readonly TokenEdit[]} edits
     */
    replaceRanges(edits: readonly TokenEdit[]): void;
    /**
     * Reports a problem with the value. The host turns each message into a
     * warning on the declaration, tagged with the plugin name when given.
     *
     * @param {string} message
     * @param {string} [plugin]
     */
    warn(message: string, plugin?: string): void;
    /**
     * The warnings reported so far, or undefined when there are none.
     *
     * @return {readonly {message: string, plugin: string | undefined}[] | undefined}
     */
    warnings(): readonly {
        message: string;
        plugin: string | undefined;
    }[] | undefined;
}
export { ValueBuffer };
//# sourceMappingURL=valueBuffer.d.ts.map