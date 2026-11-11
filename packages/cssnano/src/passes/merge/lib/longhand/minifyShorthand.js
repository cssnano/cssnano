import cssnanoUtils from '#utils';
import { hasHack } from '#stylehacks';
import { normalizeValue } from './minifyShorthandValues.js';
import { TextTable } from '../../../../values/textTable.js';
import { sourceValue } from '../../../../utils/sourceText.js';

/** @import {Container} from 'postcss' */

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
 * In-place peephole rewrite: folds identity components of a shorthand
 * declaration. Each declaration is folded on its own; the fold is cheap enough
 * that a memo per property and source was not worth keeping.
 *
 * @param {import('postcss').Declaration} decl
 * @param {string} [property] - the lowercased property name, when known
 * @param {TextTable} [table] the text table the walk left, which holds the
 * declaration's tokens; a fresh one when omitted
 * @return {void}
 */
export function foldShorthandDeclaration(
  decl,
  property = asciiLowerCase(decl.prop),
  table = new TextTable()
) {
  if (
    !foldableShorthands.has(property) ||
    hasHack(decl.raws.before, decl.prop, decl.value)
  )
    return;
  const folded = normalizeValue(
    property,
    sourceValue(decl),
    table.tokens(decl)
  );
  if (!folded || folded.text === decl.value) return;
  table.assignFolded(decl, folded);
}

/**
 * Folds immediate shorthand declarations within a container (e.g. root or at-rule).
 * @param {Container} container
 * @param {TextTable} textTable
 * @return {void}
 */
export function foldContainerDeclarations(container, textTable) {
  if (!container.nodes) return;
  for (const node of container.nodes) {
    if (node.type === 'decl') {
      foldShorthandDeclaration(node, asciiLowerCase(node.prop), textTable);
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
  const table = new TextTable();
  root.walkDecls((decl) =>
    foldShorthandDeclaration(decl, asciiLowerCase(decl.prop), table)
  );
}
