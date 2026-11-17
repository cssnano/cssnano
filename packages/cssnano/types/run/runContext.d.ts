import { DeclarationKeys } from '../ir/declarationKey.js';
import { PropertyNames } from '../ir/propertyTable.js';
import { TokenLists } from '../ir/tokenLists.js';
import { ValueIds } from '../ir/valueIds.js';
import { SelectorIds } from '../ir/selectorIds.js';
import { SelectorVerdicts } from './selectorVerdicts.js';
export type RunContext = {
    declarations: DeclarationKeys;
    names: PropertyNames;
    tokenLists: TokenLists;
    valueIds: ValueIds;
    consistencyChecks: boolean;
    features: ReadonlySet<string>;
    messages: RunMessage[];
    selectorIds: SelectorIds;
    selectorVerdicts: SelectorVerdicts;
};
export type RunMessage = {
    index: import('../ir/blockRecord.js').ArenaIndex;
    type: string;
    plugin?: string;
    text?: string;
};
/**
 * The state one run of the merge pass shares across its transforms. Nothing in
 * it may outlive the run: its ids mean nothing to another stylesheet.
 *
 * @typedef {{
 *   declarations: DeclarationKeys,
 *   names: PropertyNames,
 *   tokenLists: TokenLists,
 *   valueIds: ValueIds,
 *   consistencyChecks: boolean,
 *   features: ReadonlySet<string>,
 *   messages: RunMessage[],
 *   selectorIds: SelectorIds,
 *   selectorVerdicts: SelectorVerdicts,
 * }} RunContext
 */
/**
 * A message a transform made about one entry, appended in run order. The end
 * of the run turns it into a result message with the node of the entry: a
 * warning, which has `text`, goes through `result.warn`; a removal is pushed as
 * it is.
 *
 * @typedef {{index: import('../ir/blockRecord.js').ArenaIndex, type: string, plugin?: string, text?: string}} RunMessage
 */
/**
 * A fresh context for one run.
 *
 * @param {boolean} [consistencyChecks] whether the run checks its caches; the process default otherwise
 * @param {ReadonlySet<string>} [features] the features every browser target supports; the strict floor otherwise
 * @return {RunContext}
 */
export declare function createRunContext(consistencyChecks?: boolean, features?: ReadonlySet<string>): RunContext;
//# sourceMappingURL=runContext.d.ts.map