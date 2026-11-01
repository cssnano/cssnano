import type { DeclarationKeys } from '../../../ir/declarationKey.js';
import type { TextTable } from '../../../../values/textTable.js';
import type { BlockRecord } from './blockRecord.js';
/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */
/** @import {BlockRecord} from './blockRecord.js' */
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
 * @param {BlockRecord} block
 * @param {TextTable} textTable the tokens the walk stored, which give each
 *   layer's prelude when it has a comment
 * @return {number}
 */
export declare function containerContext(keys: DeclarationKeys, parentContext: number, block: BlockRecord, textTable: TextTable): number;
/**
 * True if two blocks apply their content the same way: they are equal blocks,
 * and so are their enclosing blocks up to the stylesheet. Either may be null,
 * for a block that has no record.
 *
 * @param {BlockRecord | null | undefined} blockA
 * @param {BlockRecord | null | undefined} blockB
 * @return {boolean}
 */
export declare function sameContainer(blockA: BlockRecord | null | undefined, blockB: BlockRecord | null | undefined): boolean;
//# sourceMappingURL=sameContainer.d.ts.map