import LastWriteIndex from './lastWriteIndex.js';
import RepeatScan from './repeatScan.js';
import { filterRuleIntersections } from './declarations.js';
import { isKeyframes } from './sameContainer.js';

/** @import {ChildNode, Container, Declaration, Rule} from 'postcss' */
/** @import MergeState from './mergeState.js' */

/**
 * A rule made only of declarations. Comments and nested rules would be
 * stranded or reordered by moving declarations out of the rule.
 *
 * @param {ChildNode} node
 * @return {node is Rule}
 */
export const isDeclarationRule = (node) =>
  node.type === 'rule' &&
  node.nodes.length > 0 &&
  node.nodes.every((child) => child.type === 'decl');

/**
 * The positions in `later` of declarations that repeat every one of
 * `declarations`, or null when a repeat does not stand first for its
 * property, since removing it would then change what `later` sets.
 *
 * @param {Declaration[]} declarations
 * @param {Declaration[]} later
 * @return {Set<number> | null}
 */
export function claimRepeats(declarations, later) {
  const { intersection, claimedIndices } = filterRuleIntersections(
    declarations,
    declarations,
    later
  );
  return intersection.length === declarations.length ? claimedIndices : null;
}

/** @param {Iterable<string>} selectors */
function listLength(selectors) {
  let total = 0;
  for (const selector of selectors) total += 1 + selector.length;
  return total;
}

/**
 * Removes `rules` from `parent` with one pass over its children.
 *
 * @param {Container} parent
 * @param {Set<Rule>} rules
 */
function detach(parent, rules) {
  if (rules.size === 0) return;
  const kept = /** @type {ChildNode[]} */ (parent.nodes).filter(
    (node) => !rules.has(/** @type {Rule} */ (node))
  );
  parent.removeAll();
  parent.append(kept);
}

/**
 * @typedef {object} Group
 * @property {Rule} rule
 * @property {number} position
 * @property {Declaration[]} declarations
 * @property {number[]} keys declaration keys, in order
 * @property {Set<string> | null} selectors listed selectors, built on demand
 * @property {number} bytes declaration bytes, each with its separator, or -1
 */

/**
 * The selectors of `later` that `group` does not list yet, and the bytes a
 * join saves: the declarations that leave `later`, less the selectors the
 * group takes. A later rule that keeps no declaration is removed with its
 * selector and braces, so that join always shortens the output.
 *
 * @param {Group} group
 * @param {Rule} later
 * @param {MergeState} mergeState
 * @return {{added: string[], gain: number}}
 */
function joinGain(group, later, mergeState) {
  if (group.bytes < 0) {
    group.bytes = group.declarations.reduce(
      (total, declaration) => total + String(declaration).length + 1,
      0
    );
  }
  const listed = (group.selectors ??= new Set(
    mergeState.meta(group.rule).selectors
  ));
  const laterSelectors = mergeState.meta(later).selectors;
  const added = [...new Set(laterSelectors)].filter(
    (selector) => !listed.has(selector)
  );
  const removed =
    group.declarations.length === later.nodes.length
      ? group.bytes + listLength(laterSelectors)
      : group.bytes;
  return { added, gain: removed - listLength(added) };
}

/**
 * A later rule that repeats all declarations of an earlier rule adds its
 * selectors to that rule, and gives up the repeated declarations, when no
 * node between them sets a property they also set: the earlier rule then
 * applies the declarations to the same elements as before. The earlier
 * rule, the group, keeps its position and its declarations, so it can take
 * further rules.
 *
 * @param {Container} parent
 * @param {MergeState} mergeState
 * @return {boolean}
 */
export default function joinByDeclarations(parent, mergeState) {
  if (isKeyframes(parent)) return false;
  const nodes = /** @type {ChildNode[]} */ (parent.nodes).slice();
  const keyLists = nodes.map((node) =>
    isDeclarationRule(node) ? mergeState.declarationKeysOf(node) : null
  );
  // Rules can only join where they share a declaration.
  const scan = new RepeatScan();
  for (const [i, own] of keyLists.entries()) {
    if (!own) continue;
    for (const key of own.keySet) scan.see(key, i);
  }
  if (scan.start === Infinity) return false;

  const index = new LastWriteIndex();
  const keysOf = mergeState.elementKeysOf;
  // Groups by their first declaration, in document order: a rule that
  // repeats a group's declarations repeats that one too.
  /** @type {Map<number, Group[]>} */
  const groups = new Map();
  // Rules whose selector lists grew; their text is written once at the end,
  // since rewriting a long list on every join would cost quadratic time.
  /** @type {Set<Rule>} */
  const grown = new Set();
  // Rules that gave up every declaration, detached together at the end:
  // removing each one splices the parent's array, which takes quadratic time.
  /** @type {Set<Rule>} */
  const emptied = new Set();
  for (let position = scan.start; position < nodes.length; position++) {
    const node = nodes[position];
    if (keyLists[position]) {
      const rule = /** @type {Rule} */ (node);
      const outcome = joinIntoGroup(rule);
      if (outcome === 'emptied') continue;
      // A trimmed rule was forgotten, so its keys are derived anew.
      register(rule, position, mergeState.declarationKeysOf(rule).keys);
    }
    index.recordNode(node, position, keysOf);
  }
  for (const rule of grown) {
    rule.selector = mergeState.meta(rule).selectorText();
  }
  detach(parent, emptied);
  return grown.size > 0;

  /**
   * @param {Rule} rule
   * @param {number} position
   * @param {number[]} keys
   */
  function register(rule, position, keys) {
    /** @type {Group} */
    const group = {
      rule,
      position,
      declarations: /** @type {Declaration[]} */ (rule.nodes),
      keys,
      selectors: null,
      bytes: -1,
    };
    const same = groups.get(keys[0]);
    if (same) same.push(group);
    else groups.set(keys[0], [group]);
  }

  /**
   * @param {Rule} later
   * @return {'emptied' | 'trimmed' | null} whether the rule gave up all its
   * declarations, some of them, or joined no group
   */
  function joinIntoGroup(later) {
    const laterDeclarations = /** @type {Declaration[]} */ (later.nodes);
    const laterSet = mergeState.declarationKeysOf(later).keySet;
    // Every declaration of `later`, claimed or not, is written by `later`.
    const laterKeys = keysOf(later);
    /** @type {{group: Group, claimed: Set<number>, added: string[], gain: number} | null} */
    let best = null;
    for (const id of laterSet) {
      const candidates = groups.get(id) ?? [];
      for (let i = candidates.length - 1; i >= 0; i--) {
        const group = candidates[i];
        // A write since a group to the property of its first declaration
        // rules out that group and every earlier one, which only cross more.
        if (
          index.conflictsSince(
            group.declarations.slice(0, 1),
            group.position,
            laterKeys
          )
        )
          break;
        if (
          group.declarations.length > laterDeclarations.length ||
          !group.keys.every((key) => laterSet.has(key))
        ) {
          continue;
        }
        const { added, gain } = joinGain(group, later, mergeState);
        // On a tie, the nearest group has the least to cross.
        if (
          gain <= 0 ||
          (best &&
            (gain < best.gain ||
              (gain === best.gain && group.position < best.group.position)))
        ) {
          continue;
        }
        const claimedIndices = claimRepeats(
          group.declarations,
          laterDeclarations
        );
        if (!claimedIndices) continue;
        const claimed = [...claimedIndices].map((j) => laterDeclarations[j]);
        if (index.conflictsSince(claimed, group.position, laterKeys)) continue;
        if (!mergeState.canMerge(group.rule, later)) continue;
        best = { group, claimed: claimedIndices, added, gain };
      }
    }
    if (!best) return null;
    const { group, claimed, added } = best;
    const listed = keysOf(group.rule) !== null;
    const gained = mergeState.addSelectors(group.rule, added);
    for (const selector of added) group.selectors?.add(selector);
    if (listed) recordGained(group, gained);
    grown.add(group.rule);
    const outcome = withdraw(later, laterDeclarations, claimed);
    mergeState.forget(later);
    mergeState.markCompatible(group.rule);
    return outcome;
  }

  /**
   * The group's declarations already stand at its position for the elements it
   * listed, so only the elements its new selectors bring are recorded. Writes
   * to unknown elements are recorded already, so only a listed group calls it.
   *
   * @param {Group} group
   * @param {readonly string[] | null} gained null when the group's elements
   * became unknown
   */
  function recordGained(group, gained) {
    if (gained?.length === 0) return;
    for (const declaration of group.declarations)
      index.record(declaration, group.position, gained);
  }

  /**
   * @param {Rule} later
   * @param {Declaration[]} declarations
   * @param {Set<number>} claimed indices of the declarations that leave
   * @return {'emptied' | 'trimmed'}
   */
  function withdraw(later, declarations, claimed) {
    // The group's writes already stand at its position, so the declarations
    // that leave `later` record nothing.
    if (claimed.size === declarations.length) {
      emptied.add(later);
      return 'emptied';
    }
    // Removing shifts positions, so the nodes are picked first.
    const leaving = [...claimed].map((j) => declarations[j]);
    for (const declaration of leaving) declaration.remove();
    return 'trimmed';
  }
}
