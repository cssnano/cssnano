import { balancedStructure } from '../utils/value.js';
import type { CSSToken } from '@csstools/css-tokenizer';
export type BalancedTokens = NonNullable<ReturnType<typeof balancedStructure>>;
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @typedef {NonNullable<ReturnType<typeof balancedStructure>>} BalancedTokens */
/**
 * The working copy of one fold over a declaration value. Reads come from the
 * source text until the first edit. Tokens are built on first use, and a
 * buffer owns its token list, so an edit never touches a list another reader
 * holds. finish serializes the result once.
 */
declare class ValueBuffer {
    #private;
    /** @param {string} source the value as the stylesheet reads it */
    constructor(source: string);
    /**
     * The current text. Before any edit this is the source text.
     *
     * @return {string}
     */
    text(): string;
    /**
     * The current tokens. The list is the buffer's own, so readers may use it
     * but should change it only through replace.
     *
     * @return {readonly CSSToken[]}
     */
    tokens(): readonly CSSToken[];
    /**
     * The bracket structure of the current tokens, or undefined when they are
     * unbalanced.
     *
     * @return {BalancedTokens | undefined}
     */
    structure(): BalancedTokens | undefined;
    /**
     * Replaces the tokens from `start` up to `end`, exclusive, with the given
     * tokens. Indexes refer to the tokens as they are now, so a reducer with
     * several edits applies them from last to first.
     *
     * @param {number} start
     * @param {number} end
     * @param {readonly CSSToken[]} replacement built with the token constructors
     */
    replace(start: number, end: number, replacement: readonly CSSToken[]): void;
    /**
     * Replaces the whole content with `text`. The tokens are read from it on
     * the next call to tokens().
     *
     * @param {string} text
     */
    replaceText(text: string): void;
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
    /**
     * The serialized text of the buffer. A buffer with no edits gives its
     * source text.
     *
     * @return {string}
     */
    finish(): string;
}
export { ValueBuffer };
//# sourceMappingURL=valueBuffer.d.ts.map