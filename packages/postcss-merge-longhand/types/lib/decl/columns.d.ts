import type { Container, Declaration } from 'postcss';
/** @import {Container, Declaration} from 'postcss'; */
export { allColumnProps, setsOtherColumnProperty } from './columnsValue.js';
/**
 * @param {Container} rule
 * @param {Declaration[]} [declarations]
 * @param {[Declaration[], Declaration[]]} [lanes]
 */
export declare function reduceColumns(rule: Container, declarations?: Declaration[], lanes?: [Declaration[], Declaration[]]): void;
//# sourceMappingURL=columns.d.ts.map