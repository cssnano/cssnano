import type { Container, Declaration } from 'postcss';
/** @import {Container, Declaration} from 'postcss'; */
export { allColumnProps, setsOtherColumnProperty } from './columnsValue.js';
/**
 * @param {Container} rule
 * @param {Declaration[]} decls
 * @param {[Declaration[], Declaration[]]} familyLanes
 */
export declare function reduceColumns(rule: Container, decls: Declaration[], familyLanes: [Declaration[], Declaration[]]): void;
//# sourceMappingURL=columns.d.ts.map