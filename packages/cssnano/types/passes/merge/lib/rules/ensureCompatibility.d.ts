import type { CSSToken } from '@csstools/css-tokenizer';
import type { Rule } from 'postcss';
import type { SelectorRange } from '../../../../values/selectorRanges.js';
import type { TextTable } from '../../../../values/textTable.js';
export declare const simpleSelectorRe: RegExp;
export type SelectorInfo = {
    compatible: boolean;
    prefix: string | undefined;
    msPlaceholder: boolean;
};
export type RuleSpans = {
    source: string;
    list: readonly CSSToken[];
    spans: SelectorRange[];
    selectors: string[];
};
/**
 * Looks up selectors in a cache that is shared by every check, so each
 * distinct selector is scanned once per stylesheet. A lookup that names the
 * rule a selector belongs to parses it from that rule's tokens. Do not pass
 * it to `map`, which would give the index as the rule.
 *
 * @param {readonly string[]} browsers
 * @param {Map<string, SelectorInfo>} [cache]
 * @param {TextTable} [table] the tokens of the rules' selectors
 * @return {(selector: string, rule?: Rule, index?: number) => SelectorInfo}
 */
export declare function createSelectorLookup(browsers: readonly string[], cache?: Map<string, SelectorInfo>, table?: TextTable): (selector: string, rule?: Rule, index?: number) => SelectorInfo;
/**
 * @param {string[]} selectors
 * @param {(selector: string, rule?: Rule, index?: number) => SelectorInfo} lookup
 * @param {Rule} [rule] the rule whose own list the selectors are, when they are
 * @return {boolean}
 */
export declare function selectorsCompatible(selectors: string[], lookup: (selector: string, rule?: Rule, index?: number) => SelectorInfo, rule?: Rule): boolean;
//# sourceMappingURL=ensureCompatibility.d.ts.map