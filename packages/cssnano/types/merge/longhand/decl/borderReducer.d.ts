import type { BlockDeclarations } from '../blockDeclarations.js';
import type { ValueComponent } from '../componentRanges.js';
export type SegmentState = {
    cells: string[];
    cellComponents: (ValueComponent | undefined)[];
    cellHistory: Set<number>[];
    touched: Set<number>;
    barrierCells: Set<number>;
    fallbacks: Set<number>;
    resetFound: boolean;
};
/**
 * @param {BlockDeclarations} list
 * @param {number[]} decls - positions in `list`
 * @param {boolean} hasForeignBorder
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {void}
 */
export declare function reduceBorder(list: BlockDeclarations, decls: number[], hasForeignBorder: boolean, features: ReadonlySet<string>): void;
//# sourceMappingURL=borderReducer.d.ts.map