import { balancedStructure } from '../utils/value.js';
import type { CSSToken } from '@csstools/css-tokenizer';
export type BalancedTokens = NonNullable<ReturnType<typeof balancedStructure>>;
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @typedef {NonNullable<ReturnType<typeof balancedStructure>>} BalancedTokens */
/**
 * A declaration value, as the text it was read from. Its tokens and bracket
 * structure are built on first use and then shared by every reader.
 */
declare class Value {
    #private;
    /** @readonly */
    readonly text: string;
    /** @param {string} text */
    constructor(text: string);
    /**
     * The tokens of the text, without the end-of-file token. The list and each
     * token are frozen, so a reader cannot change what another reader sees.
     *
     * @return {readonly CSSToken[]}
     */
    tokens(): readonly CSSToken[];
    /**
     * The bracket structure of the tokens, or undefined when a bracket is
     * unclosed or closes out of order.
     *
     * @return {BalancedTokens | undefined}
     */
    structure(): BalancedTokens | undefined;
}
/**
 * The values of one run. Equal text gives the same Value, and no Value
 * outlives the table that interned it.
 */
declare class ValueTable {
    #private;
    /**
     * @param {string} text
     * @return {Value}
     */
    intern(text: string): Value;
}
export { Value, ValueTable };
//# sourceMappingURL=value.d.ts.map