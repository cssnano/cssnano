import type { CSSToken } from '@csstools/css-tokenizer';
import type { TokenLists, TokenListId } from './tokenLists.js';
import type { TokenizeMode } from '../values/valueBuffer.js';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {TokenLists, TokenListId} from './tokenLists.js' */
/** @import {TokenizeMode} from '../values/valueBuffer.js' */
/**
 * The values of one run, each with the id that its text and tokenizer mode give
 * on first use. Two values have the same id exactly when their texts are equal
 * in the same mode, so comparing declarations compares integers. The table
 * lives for the run, since a value a rewrite writes must share the id of an
 * author-written value of the same text.
 */
export declare class ValueIds {
    #private;
    /**
     * @param {TokenLists} tokenLists the run's lists, which take the tokens of a value new to the run
     * @param {TokenizeMode | undefined} mode the tokenizer mode of the value's property
     * @param {string} text the value's text
     * @param {readonly CSSToken[] | undefined} [tokens] the tokens
     * of the text, when the caller has them; the text is tokenized otherwise
     * @return {TokenListId} the id of the value, given at its first use
     */
    idOf(tokenLists: TokenLists, mode: TokenizeMode | undefined, text: string, tokens?: readonly CSSToken[] | undefined): TokenListId;
    /**
     * The id of a selector list's text. A list that ends in a backslash takes the
     * tokens that a newline after it gives, since the newline makes the backslash
     * an invalid escape; the same text as a declaration value would tokenize it as
     * a valid escape at the end. Such a list has its own table.
     *
     * @param {TokenLists} tokenLists
     * @param {string} text the list as written, or with its comments removed
     * @return {TokenListId}
     */
    selectorListIdOf(tokenLists: TokenLists, text: string): TokenListId;
}
//# sourceMappingURL=valueIds.d.ts.map