import type { BlockDeclarations } from '../blockDeclarations.js';
/** @import {BlockDeclarations} from '../blockDeclarations.js'; */
export { allColumnProps, setsOtherColumnProperty } from './columnsValue.js';
/**
 * @param {BlockDeclarations} list
 * @param {readonly number[]} decls - the column declarations of the run
 * @param {[number[], number[]]} familyLanes
 * @param {ReadonlySet<string>} features the features every target supports
 */
export declare function reduceColumns(list: BlockDeclarations, decls: readonly number[], familyLanes: [number[], number[]], features: ReadonlySet<string>): void;
//# sourceMappingURL=columns.d.ts.map