import type { TextTable } from '../../../../values/textTable.js';
import type { BlockRecord } from './blockRecords.js';
/**
 * True for `@keyframes` and its vendor-prefixed forms, whose selectors are
 * cascaded by position.
 *
 * @param {import('postcss').Container | undefined} container
 * @return {boolean}
 */
export declare function isKeyframes(container: import('postcss').Container | undefined): boolean;
/**
 * True if two blocks apply their content the same way: they are equal blocks,
 * and so are their enclosing blocks up to the stylesheet. Either may be null,
 * for a block that has no record.
 *
 * @param {BlockRecord | null | undefined} blockA
 * @param {BlockRecord | null | undefined} blockB
 * @param {TextTable} textTable the selector tokens the walk stored, which give
 *   each layer's prelude when it has a comment
 * @return {boolean}
 */
export declare function sameContainer(blockA: BlockRecord | null | undefined, blockB: BlockRecord | null | undefined, textTable: TextTable): boolean;
//# sourceMappingURL=sameContainer.d.ts.map