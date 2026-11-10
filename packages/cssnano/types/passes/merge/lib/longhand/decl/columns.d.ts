import type { Container, Declaration } from 'postcss';
/** @import {Container, Declaration} from 'postcss'; */
export { allColumnProps, setsOtherColumnProperty } from './columnsValue.js';
/**
 * @param {Container} rule
 * @param {Declaration[]} decls
 * @param {[Declaration[], Declaration[]]} familyLanes
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 * @param {ReadonlySet<string>} features the features every target supports
 */
export declare function reduceColumns(rule: Container, decls: Declaration[], familyLanes: [Declaration[], Declaration[]], textTable: import('../../../../../values/textTable.js').TextTable, features: ReadonlySet<string>): void;
//# sourceMappingURL=columns.d.ts.map