import type { ArenaIndex } from '../../../passes/ir/blockRecord.js';
import type { BlockRecords } from '../../../passes/ir/blockRecords.js';
declare const VENDOR_PREFIX: RegExp;
declare const CSS_WIDE_KEYWORDS: Set<string>;
declare const KEYFRAMES_SHORTHAND_KEYWORDS: Set<string>;
declare const COUNTER_STYLE_RESERVED: Set<string>;
declare const COUNTER_STYLE_FUNCTIONS: Map<string, number[]>;
/**
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} parsedTokens
 *   the tokens of the prelude, whose comments and whitespace are skipped
 * @param {string} atRuleName
 * @return {{ isString: boolean, isReservedName: boolean, key: string, tokenText: string } | null}
 */
declare function parseAtRuleName(parsedTokens: readonly import('@csstools/css-tokenizer').CSSToken[], atRuleName: string): {
    isString: boolean;
    isReservedName: boolean;
    key: string;
    tokenText: string;
} | null;
/**
 * @param {string} prop the lowercase property name
 * @param {boolean} inCounterStyle whether the declaration is a child of a `@counter-style` rule
 * @return {{ namespace: 'keyframes' | 'counter-style', kind: 'animation-shorthand' | 'animation-name' | 'counter-style' | 'counter-style-func' } | null}
 */
declare function classifyDeclaration(prop: string, inCounterStyle: boolean): {
    namespace: 'keyframes' | 'counter-style';
    kind: 'animation-shorthand' | 'animation-name' | 'counter-style' | 'counter-style-func';
} | null;
/**
 * Whether a record is a `@layer` at-rule, with a block or as a statement.
 *
 * @param {{kind: number, name?: string}} entry
 * @return {boolean}
 */
declare function isLayerEntry(entry: {
    kind: number;
    name?: string;
}): boolean;
/**
 * The nearest ancestor that decides whether a definition applies at all.
 * Cascade layers only order definitions, so they are looked through.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @return {ArenaIndex} the rule, block or stylesheet that holds the definition
 */
declare function getConditionContainer(records: BlockRecords, index: ArenaIndex): ArenaIndex;
export { VENDOR_PREFIX, CSS_WIDE_KEYWORDS, KEYFRAMES_SHORTHAND_KEYWORDS, COUNTER_STYLE_RESERVED, COUNTER_STYLE_FUNCTIONS, parseAtRuleName, classifyDeclaration, getConditionContainer, isLayerEntry, };
//# sourceMappingURL=grammar.d.ts.map