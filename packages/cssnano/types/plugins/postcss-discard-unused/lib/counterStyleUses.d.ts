import type { CSSToken } from '@csstools/css-tokenizer';
import type { BlockRecords } from '../../../ir/blockRecords.js';
import type { TokenLists } from '../../../ir/tokenLists.js';
import type { RecordSymbolLists } from '../../../run/symbolLists.js';
/**
 * Adds the counter styles that calls such as `counter()` and
 * `target-counter()` name, decoded so an escaped spelling matches. The
 * functions and the arguments that name a style come from the data
 * reduce-idents renames them by; such an argument names one when it is a lone
 * identifier. The scan resumes after each call, since none of these
 * functions takes another as an argument, which keeps it linear.
 *
 * @param {readonly CSSToken[]} tokens the tokens of a value such as `content`
 * @param {Set<string>} names
 * @param {string[]} [added] receives each name that was not yet in `names`
 * @return {void}
 */
export declare function addCounterStyleCalls(tokens: readonly CSSToken[], names: Set<string>, added?: string[]): void;
/**
 * The name a `@counter-style` prelude defines: the key of a lone identifier,
 * decoded so an escaped spelling matches its references, or else the
 * prelude's text.
 *
 * @param {readonly CSSToken[]} prelude
 * @return {string}
 */
export declare function counterStyleName(prelude: readonly CSSToken[]): string;
/**
 * The names that the counter styles in use reach. A declaration outside every
 * counter style, such as `list-style`, uses a name; a counter style that is in
 * use uses the names its own declarations (such as `system: extends`) refer to.
 * Reachability, not a single scan, so a chain of unused counter styles goes in
 * one run.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {RecordSymbolLists} lists
 * @return {Set<string> | undefined} undefined when a substitution function
 *   makes the use unknowable
 */
export declare function usedCounterStyleNames(records: BlockRecords, tokenLists: TokenLists, lists: RecordSymbolLists): Set<string> | undefined;
//# sourceMappingURL=counterStyleUses.d.ts.map