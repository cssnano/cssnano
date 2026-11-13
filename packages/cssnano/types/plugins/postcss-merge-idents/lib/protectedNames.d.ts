import { classifyDeclaration } from './grammar.js';
import type { CSSToken } from '@csstools/css-tokenizer';
import type { ArenaIndex } from '../../../passes/ir/blockRecord.js';
import type { BlockRecords } from '../../../passes/ir/blockRecords.js';
import type { TokenLists } from '../../../passes/ir/tokenLists.js';
export type Reference = {
    index: ArenaIndex;
    classification: NonNullable<ReturnType<typeof classifyDeclaration>>;
    value: string;
    tokens: readonly CSSToken[];
};
/**
 * One pass over the stylesheet's declarations that finds the names substituted
 * text may spell and the declarations that reference keyframes or counter
 * styles. Substituted text is custom property values, `@property` initial
 * values, `@function` definitions, and references inside functions other than
 * the known counter-function argument slots. Declaration walks do not rewrite
 * such names, so they must protect their definitions.
 *
 * The invariant: every place a name is spelled is either rewritten when its
 * definition is removed or keeps that definition. A spelling that no
 * declaration rewrite reaches therefore has to be collected here.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex[]} decls every declaration of the stylesheet that is still
 *   attached
 * @param {Set<string>} candidates the names that may be merged; only they
 *   need protection
 * @param {ArenaIndex[]} functionRules the `@function` rules
 * @param {ArenaIndex[]} parameterRules the `@mixin` and `@apply` rules, whose
 *   parameter defaults and arguments are substituted
 * @param {ArenaIndex[]} conditionRules the `@container`, `@when` and `@else`
 *   rules, whose preludes may test a property in a style query
 * @return {{ protectedNames: Set<string>, references: Reference[] }}
 */
declare function scanDeclarations(records: BlockRecords, tokenLists: TokenLists, decls: ArenaIndex[], candidates: Set<string>, functionRules: ArenaIndex[], parameterRules: ArenaIndex[], conditionRules: ArenaIndex[]): {
    protectedNames: Set<string>;
    references: Reference[];
};
export { scanDeclarations };
//# sourceMappingURL=protectedNames.d.ts.map