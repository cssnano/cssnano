import type { Container, Declaration } from 'postcss';
/**
 * @param {Container} rule
 * @param {Declaration[]} decls
 * @param {[Declaration[], Declaration[]]} lanes
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 * @param {ReadonlySet<string>} features the features every target supports
 */
export declare function reduceBorderRadius(rule: Container, decls: Declaration[], lanes: [Declaration[], Declaration[]], textTable: import('../../../../../values/textTable.js').TextTable, features: ReadonlySet<string>): void;
//# sourceMappingURL=borderRadiusReducer.d.ts.map