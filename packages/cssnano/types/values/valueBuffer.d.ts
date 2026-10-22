import { balancedStructure } from '../utils/value.js';
import type { CSSToken } from '@csstools/css-tokenizer';
import type { Value, ValueTable } from './value.js';
export type BalancedTokens = NonNullable<ReturnType<typeof balancedStructure>>;
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Value, ValueTable} from './value.js' */
/** @typedef {NonNullable<ReturnType<typeof balancedStructure>>} BalancedTokens */
/**
 * The working copy of one fold over a Value. Reads come from the source until
 * the first edit. After it, the buffer owns a token list and edits that list
 * only; finish serializes the list once and interns the result.
 */
declare class ValueBuffer {
    #private;
    /**
     * @param {Value} source
     * @param {ValueTable} table interns the Value that finish returns
     */
    constructor(source: Value, table: ValueTable);
    /**
     * The current text. Before any edit this is the source text.
     *
     * @return {string}
     */
    text(): string;
    /**
     * The current tokens. Before any edit these are the source's frozen tokens.
     * After an edit they are the buffer's own list, which reducers may read but
     * should change only through replace.
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
     * The Value of the current text. A buffer with no edits gives its source.
     *
     * @return {Value}
     */
    finish(): Value;
}
export { ValueBuffer };
//# sourceMappingURL=valueBuffer.d.ts.map