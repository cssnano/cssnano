import type { ArenaIndex } from '../../../ir/blockRecord.js';
import type { BlockRecords } from '../../../ir/blockRecords.js';
import type { TokenLists } from '../../../ir/tokenLists.js';
export type FamilyTrie = {
    /**
     * the nodes one word earlier
     */
    preceding: Map<string, FamilyTrie>;
    /**
     * the family these words spell, if any
     */
    family: string | undefined;
};
/**
 * A `@font-face` goes when it names no family, or when no family that its
 * descriptors name is in use. A substitution function in a family declaration
 * may name any family, so every face that names one stays, as does a face
 * with a descriptor that is not a plain family name.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex[]} indices
 * @param {ArenaIndex[]} decls
 * @param {(index: ArenaIndex) => void} remove
 * @return {void}
 */
export declare function filterFont(records: BlockRecords, tokenLists: TokenLists, indices: ArenaIndex[], decls: ArenaIndex[], remove: (index: ArenaIndex) => void): void;
//# sourceMappingURL=fontFaceUses.d.ts.map