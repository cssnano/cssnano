import type { Container, Declaration } from 'postcss';
import type { TextTable } from '../../../../../values/textTable.js';
/**
 * @param {Container} rule
 * @param {Declaration[]} decls
 * @param {boolean} hasForeignBorder
 * @param {TextTable} textTable the tokens the walk left for the declarations
 * @return {void}
 */
export declare function reduceBorder(rule: Container, decls: Declaration[], hasForeignBorder: boolean, textTable: TextTable): void;
//# sourceMappingURL=borderReducer.d.ts.map