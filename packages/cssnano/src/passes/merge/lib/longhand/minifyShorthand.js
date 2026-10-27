import cssnanoUtils from '#utils';
import { detectDeclaration } from '#stylehacks';
import { normalizeValue } from './minifyShorthandValues.js';
import { TextTable } from '../../../../values/textTable.js';
import { sourceValue } from '../../../../utils/sourceText.js';

/** @import {Container} from 'postcss' */
/** @import {FoldedText} from '../../../../values/textTable.js' */

const { asciiLowerCase } = cssnanoUtils;

/**
 * Shorthand properties whose redundant axes, sides, or default components can be
 * algebraically folded in-place without inter-declaration data dependencies.
 */
export const foldableShorthands = new Set([
  'aspect-ratio',
  'border-spacing',
  'gap',
  'inset',
  'overflow',
  'overscroll-behavior',
  'place-content',
  'place-items',
  'place-self',
  'scroll-margin',
  'scroll-padding',
  'transition',
  '-webkit-transition',
]);

/**
 * In-place peephole rewrite: folds identity components of a shorthand declaration
 * using a memoization table to cache pure value transformations across the AST.
 *
 * @param {import('postcss').Declaration} decl
 * @param {Map<string, FoldedText | null>} [memoTable]
 * @param {string} [property] - the lowercased property name, when known
 * @param {TextTable} [table] the text table the walk left, which holds the
 * declaration's tokens; a fresh one when omitted
 * @return {void}
 */
export function foldShorthandDeclaration(
  decl,
  memoTable,
  property = asciiLowerCase(decl.prop),
  table = new TextTable()
) {
  if (!foldableShorthands.has(property) || detectDeclaration(decl)) return;
  const source = sourceValue(decl);
  const memoKey = `${property}\0${source}`;
  let folded;
  if (memoTable) {
    folded = memoTable.get(memoKey);
    if (folded === undefined && !memoTable.has(memoKey)) {
      folded = normalizeValue(property, source, table.tokens(decl));
      memoTable.set(memoKey, folded);
    }
  } else {
    folded = normalizeValue(property, source, table.tokens(decl));
  }
  if (!folded || folded.text === decl.value) return;
  table.assignFolded(decl, folded);
}

/**
 * Folds immediate shorthand declarations within a container (e.g. root or at-rule).
 * @param {Container} container
 * @param {Map<string, FoldedText | null>} shorthandMemoTable
 * @param {TextTable} textTable
 * @return {void}
 */
export function foldContainerDeclarations(
  container,
  shorthandMemoTable,
  textTable
) {
  if (!container.nodes) return;
  for (const node of container.nodes) {
    if (node.type === 'decl') {
      foldShorthandDeclaration(
        node,
        shorthandMemoTable,
        asciiLowerCase(node.prop),
        textTable
      );
    }
  }
}

/**
 * Full AST traversal fallback for standalone shorthand identity canonicalization.
 *
 * @param {import('postcss').Root} root
 * @return {void}
 */
export default function minifyShorthandIdentities(root) {
  /** @type {Map<string, FoldedText | null>} */
  const memoTable = new Map();
  const table = new TextTable();
  root.walkDecls((decl) =>
    foldShorthandDeclaration(decl, memoTable, asciiLowerCase(decl.prop), table)
  );
}
