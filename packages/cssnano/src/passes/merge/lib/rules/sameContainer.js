import cssnanoUtils from '#utils';
import { step } from '../../../ir/declarationKey.js';

const { asciiLowerCase, isAnonymousLayer } = cssnanoUtils;

// The first steps of a context's path, apart from those of declarations and
// of the structural ids that duplicate removal takes from the same interner.
const CONTEXT = Symbol('container context');
const ANONYMOUS = Symbol('anonymous layer');

/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */
/** @import {BlockRecord} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */

/**
 * True for `@keyframes` and its vendor-prefixed forms, whose selectors are
 * cascaded by position.
 *
 * @param {import('postcss').Container | undefined} container
 * @return {boolean}
 */
export function isKeyframes(container) {
  return (
    container?.type === 'atrule' &&
    asciiLowerCase(
      /** @type {import('postcss').AtRule} */ (container).name
    ).includes('keyframes')
  );
}

/**
 * The id of the circumstances under which a block applies its content: its own
 * prelude and those of its enclosing blocks. Blocks with equal ids apply their
 * content the same way. At-rule names fold ASCII case, rules compare their
 * selectors, and each anonymous layer is a context of its own.
 *
 * @param {DeclarationKeys} keys the run's interner
 * @param {number} parentContext the context of the enclosing block, -1 for the stylesheet
 * @param {BlockRecord | RuleRecord} block the block, or the rule that nests
 * @param {TextTable} textTable the tokens the walk stored, which give each
 *   layer's prelude when it has a comment
 * @return {number}
 */
export function containerContext(keys, parentContext, block, textTable) {
  const node = /** @type {import('postcss').AnyNode} */ (block.node);
  let trie = step(step(keys.root, CONTEXT), parentContext);
  if (node.type === 'atrule') {
    const name = asciiLowerCase(node.name);
    trie = step(step(trie, 'atrule'), name);
    trie =
      name === 'layer' && isAnonymousLayer(node, textTable)
        ? step(step(trie, ANONYMOUS), block.index)
        : step(trie, node.params);
  } else if (node.type === 'rule') {
    trie = step(step(trie, 'rule'), node.selector);
  } else {
    trie = step(trie, node.type);
  }
  return keys.leafOf(trie);
}

/**
 * True if two containers apply their content the same way: they are equal
 * containers, and so are their enclosing containers up to the stylesheet. Either
 * may be null, for a container that has no record.
 *
 * @param {BlockRecord | RuleRecord | null | undefined} blockA
 * @param {BlockRecord | RuleRecord | null | undefined} blockB
 * @return {boolean}
 */
export function sameContainer(blockA, blockB) {
  if (!blockA || !blockB) {
    return !blockA && !blockB;
  }
  return blockA.context === blockB.context;
}
