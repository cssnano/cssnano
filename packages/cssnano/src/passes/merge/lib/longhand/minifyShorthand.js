import cssnanoUtils from '#utils';
import { hasHack } from '#stylehacks';
import { normalizeValue } from './minifyShorthandValues.js';
import { TextTable } from '../../../../values/textTable.js';
import { createRunContext } from '../../../ir/runContext.js';
import { RUN_END } from './blockDeclarations.js';
import { commitToNodes, declarationsFromNodes } from './nodeDeclarations.js';

/** @import {AtRule, Root, Rule} from 'postcss' */
/** @import {BlockDeclarations} from './blockDeclarations.js' */

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
 * @param {BlockDeclarations} list
 * @param {number} position
 * @param {string} [property] - the lowercased property name, when known
 * @return {void}
 */
export function foldShorthandDeclaration(
  list,
  position,
  property = asciiLowerCase(list.at(position).prop)
) {
  const decl = list.at(position);
  if (
    !foldableShorthands.has(property) ||
    hasHack(decl.before, decl.prop, decl.value)
  )
    return;
  const folded = normalizeValue(property, decl.value, decl.tokens);
  if (!folded || folded.text === decl.value) return;
  list.rewrite(position, decl.prop, folded.text, folded.tokens);
}

/**
 * Folds the shorthand declarations of a container's block. A value with an
 * important comment is kept as written, so it is left as it is.
 *
 * @param {BlockDeclarations} list
 * @param {readonly number[]} chain - the positions of the block's declarations
 * @return {void}
 */
export function foldContainerDeclarations(list, chain) {
  for (const position of chain) {
    if (position !== RUN_END && !list.at(position).kept) {
      foldShorthandDeclaration(list, position);
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
  const run = createRunContext(new TextTable());
  /** @type {(Root | Rule | AtRule)[]} */
  const containers = [root];
  root.walk((node) => {
    if (node.type === 'rule' || node.type === 'atrule') containers.push(node);
  });
  for (const container of containers) {
    const block = declarationsFromNodes(container, run);
    foldContainerDeclarations(block.list, block.list.chain);
    commitToNodes(block, run.textTable);
  }
}
