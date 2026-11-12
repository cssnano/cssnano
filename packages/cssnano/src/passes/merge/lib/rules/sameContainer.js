import { step } from '../../../ir/declarationKey.js';
import {
  AT_RULE_BLOCK,
  KEYFRAMES,
  LAYER,
  RULE,
  STYLESHEET,
} from '../../../ir/blockRecord.js';

// The first steps of a context's path, apart from those of declarations and
// of the structural ids that duplicate removal takes from the same interner.
const CONTEXT = Symbol('container context');
const ANONYMOUS = Symbol('anonymous layer');

/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
/** @import {BlockRecord} from '../../../ir/blockRecord.js' */
/** @import {RuleRecord} from '../../../ir/ruleRecord.js' */

/**
 * True for `@keyframes` and its vendor-prefixed forms, whose selectors are
 * cascaded by position.
 *
 * @param {BlockRecord | RuleRecord | undefined} container
 * @return {boolean}
 */
export function isKeyframes(container) {
  return (
    container?.kind === AT_RULE_BLOCK && container.atRuleKind === KEYFRAMES
  );
}

/**
 * The id of the circumstances under which a block applies its content: its own
 * prelude and those of its enclosing blocks. Blocks with equal ids apply their
 * content the same way. At-rule names fold ASCII case, rules compare their
 * selector lists by the ids of their selectors, and each anonymous layer is a
 * context of its own.
 *
 * @param {DeclarationKeys} keys the run's interner
 * @param {number} parentContext the context of the enclosing block, -1 for the stylesheet
 * @param {BlockRecord | RuleRecord} block the block, or the rule that nests
 * @return {number}
 */
export function containerContext(keys, parentContext, block) {
  let trie = step(step(keys.root, CONTEXT), parentContext);
  if (block.kind === RULE) {
    trie = step(trie, 'rule');
    for (const id of /** @type {RuleRecord} */ (block).selectorIds)
      trie = step(trie, id);
  } else if (block.kind === STYLESHEET) {
    trie = step(trie, 'root');
  } else {
    trie = step(step(trie, 'atrule'), block.name);
    trie =
      block.atRuleKind === LAYER && block.anonymous
        ? step(step(trie, ANONYMOUS), block.index)
        : step(trie, block.params);
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
