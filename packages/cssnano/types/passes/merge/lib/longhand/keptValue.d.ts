import type { Declaration } from 'postcss';
import type { TextTable } from '../../../../values/textTable.js';
/**
 * Whether the value as written holds an important comment. The longhand rounds
 * keep such a declaration as written: they neither rewrite, remove nor fold it,
 * and no shorthand merges across it.
 *
 * @param {TextTable} textTable
 * @param {Declaration} decl
 * @return {boolean}
 */
export declare function keepsValueAsWritten(textTable: TextTable, decl: Declaration): boolean;
//# sourceMappingURL=keptValue.d.ts.map