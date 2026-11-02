import type { DeclarationKeys } from '../../../ir/declarationKey.js';
import type { TextTable } from '../../../../values/textTable.js';
import type { BlockRecord } from './blockRecord.js';
import type { RuleRecord } from './ruleRecord.js';
/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */
/** @import {BlockRecord} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/**
 * True for `@keyframes` and its vendor-prefixed forms, whose selectors are
 * cascaded by position.
 *
 * @param {import('postcss').Container | undefined} container
 * @return {boolean}
 */
export declare function isKeyframes(container: import('postcss').Container | undefined): boolean;
/**
 * The id of the circumstances under which a block applies its content: its own
 * prelude and those of its enclosing blocks. Blocks with equal ids apply their
 * content the same way. At-rule names fold ASCII case, rules compare their
 * selectors, and each anonymous layer is a context of its own.
 *
 * @param {DeclarationKeys} keys the run's interner
 * @param {number} parentContext the context of the enclosing block, -1 for the stylesheet
 * @param {BlockRecord | RuleRecord} block the block, or the rule that nests
 * @param {TextTable} textTable the tokens the walk stored, which give each
 *   layer's prelude when it has a comment
 * @return {number}
 */
export declare function containerContext(keys: DeclarationKeys, parentContext: number, block: BlockRecord | RuleRecord, textTable: TextTable): number;
/**
 * True if two containers apply their content the same way: they are equal
 * containers, and so are their enclosing containers up to the stylesheet. Either
 * may be null, for a container that has no record.
 *
 * @param {BlockRecord | RuleRecord | null | undefined} blockA
 * @param {BlockRecord | RuleRecord | null | undefined} blockB
 * @return {boolean}
 */
export declare function sameContainer(blockA: BlockRecord | RuleRecord | null | undefined, blockB: BlockRecord | RuleRecord | null | undefined): boolean;
//# sourceMappingURL=sameContainer.d.ts.map