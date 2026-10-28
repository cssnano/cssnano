import type { CSSToken } from '@csstools/css-tokenizer';
import type { TextTable } from './textTable.js';
import type { Declaration } from 'postcss';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {TextTable} from './textTable.js' */
/** @import {Declaration} from 'postcss' */
/**
 * The tokens that spell a declaration's `decl.value`. PostCSS strips some
 * comments from the value, so the stored list may spell more than the value;
 * then the value is tokenized once, and a caller's cache keeps that list.
 *
 * @param {TextTable} textTable
 * @param {Declaration} decl
 * @param {Map<string, readonly CSSToken[]>} [cache] lists of `decl.value`
 * @return {readonly CSSToken[]}
 */
export declare function declaredValueTokens(textTable: TextTable, decl: Declaration, cache?: Map<string, readonly CSSToken[]>): readonly CSSToken[];
//# sourceMappingURL=declaredValueTokens.d.ts.map