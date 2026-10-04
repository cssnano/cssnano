import cssnanoUtils from 'cssnano-utils';
import { propertyNameKey } from './declarations.js';
import { getMeta, hasSameSelectors } from './rule-meta.js';

const { sameParent } = cssnanoUtils;

const NO_BENEFIT = -1;

/** @import {ChildNode, Container, Declaration, Node, Root, Rule} from 'postcss' */
/** @import {RuleMeta} from './rule-meta.js' */

/**
 * @typedef {Object} ScanOperations
 * @property {(first: Rule, second: Rule) => boolean} canMerge
 * @property {(first: Rule, second: Rule) => boolean} mergeParents
 * @property {(first: Rule, second: Rule) => Rule[] | null} mergeMatchingDeclarations
 * @property {(first: Rule, second: Rule) => Rule[] | null} mergeMatchingSelectors
 * @property {(first: Rule, second: Rule) => Rule[]} partialMerge
 * @property {WeakMap<Rule, RuleMeta>} ruleMeta
 */

/**
 * @typedef {object} RuleProfile
 * @property {RuleMeta} meta
 * @property {number[]} ids
 * @property {Set<number>} idSet
 */

/**
 * Rule profiles for every run of the scan over one stylesheet. A profile is
 * keyed by the rule's metadata. Joins delete it for a rule whose declarations
 * they edit; a rule that only gains selectors keeps it, and the profile reads
 * the selectors through the metadata, so it stays current.
 *
 * @return {{profiles: WeakMap<RuleMeta, RuleProfile>, declarationIds: Map<string, number>}}
 */
export function createProfileCache() {
  return { profiles: new WeakMap(), declarationIds: new Map() };
}

/**
 * Rules in stylesheet order, including rules nested in other rules.
 *
 * @param {ChildNode[]} nodes
 * @param {Rule[]} [rules]
 * @return {Rule[]}
 */
function collectRules(nodes, rules = []) {
  for (const node of nodes) {
    if (node.type === 'rule') rules.push(node);
    if ('nodes' in node && node.nodes) collectRules(node.nodes, rules);
  }
  return rules;
}

/**
 * A doubly linked list lets the scan replace a merged pair in constant time,
 * where splicing an array of thousands of rules would take quadratic time.
 *
 * @typedef {{rule: Rule, prev: RuleLink | null, next: RuleLink | null}} RuleLink
 */

/**
 * @param {Rule[]} rules
 * @return {RuleLink} a sentinel that precedes the first rule
 */
function linkRules(rules) {
  /** @type {RuleLink} */
  const head = {
    rule: /** @type {Rule} */ (/** @type {unknown} */ (null)),
    prev: null,
    next: null,
  };
  let tail = head;
  for (const rule of rules) {
    /** @type {RuleLink} */
    const link = { rule, prev: tail, next: null };
    tail.next = link;
    tail = link;
  }
  return head;
}

/**
 * Replaces `first` and the link after it with the rules that now stand in
 * their place, which are never none.
 *
 * @param {RuleLink} first
 * @param {Rule[]} rules
 * @return {RuleLink} the link of the first replacement
 */
function replacePair(first, rules) {
  const before = /** @type {RuleLink} */ (first.prev);
  let tail = before;
  for (const rule of rules) {
    /** @type {RuleLink} */
    const link = { rule, prev: tail, next: null };
    tail.next = link;
    tail = link;
  }
  const after = /** @type {RuleLink} */ (first.next).next;
  tail.next = after;
  if (after) after.prev = tail;
  return /** @type {RuleLink} */ (before.next);
}

/**
 * The node that follows `node` and its descendants in a depth-first walk of
 * `scope`.
 *
 * @param {Node} node
 * @param {Container} scope
 * @return {Node | undefined}
 */
function nextAfterSubtree(node, scope) {
  /** @type {Node | undefined} */
  let current = node;
  while (current && current !== scope) {
    const sibling = current.next();
    if (sibling) return sibling;
    current = current.parent;
  }
  return undefined;
}

/**
 * The node that follows `node` in a depth-first walk of `scope`.
 *
 * @param {Node} node
 * @param {Container} scope
 * @return {Node | undefined}
 */
function nextInSourceOrder(node, scope) {
  const children = /** @type {Container} */ (node).nodes;
  return children?.length ? children[0] : nextAfterSubtree(node, scope);
}

/**
 * True if a declaration of `container` or of an at-rule inside it, rather
 * than of a nested rule, exists. Only such declarations can separate two
 * neighboring rules.
 *
 * @param {Container} container
 * @return {boolean}
 */
function hasDeclarationOutsideRules(container) {
  return (container.nodes ?? []).some(
    (node) =>
      node.type === 'decl' ||
      (node.type === 'atrule' && hasDeclarationOutsideRules(node))
  );
}

/**
 * True if a declaration outside both rules lies between them. CSS Nesting
 * keeps a declaration that follows nested rules in source order, so neither
 * rule may move across it. Neighbors hold no rule between them, so any such
 * declaration belongs to an enclosing rule or a block nested in it.
 *
 * @param {Rule} first
 * @param {Rule} second
 * @param {WeakMap<Container, boolean>} outsideDeclarations whether a rule has
 * a declaration outside its nested rules, valid for the whole scan: rewrites
 * move declarations between rules but never create one outside them
 * @return {boolean}
 */
function declarationBetween(first, second, outsideDeclarations) {
  /** @type {Container | undefined} */
  let enclosing = first.parent;
  while (enclosing && enclosing.type !== 'rule') {
    enclosing = /** @type {Container | undefined} */ (enclosing.parent);
  }
  if (!enclosing) return false;
  let hasOutside = outsideDeclarations.get(enclosing);
  if (hasOutside === undefined) {
    hasOutside = hasDeclarationOutsideRules(enclosing);
    outsideDeclarations.set(enclosing, hasOutside);
  }
  if (!hasOutside) return false;
  // Visit the nodes after `first` in source order up to `second`; the gap is
  // short, so the cost does not depend on how much precedes `first`. `first`
  // holds only declarations and comments, so its own contents are skipped.
  /** @type {Node | undefined} */
  let node = nextAfterSubtree(first, enclosing);
  while (node && node !== second) {
    if (node.type === 'decl') return true;
    node = nextInSourceOrder(node, enclosing);
  }
  return false;
}

/**
 * Merges neighboring rules in left-to-right sweeps, trying the pair that
 * shares the most declarations first and the earlier pair on a tie. That
 * approximates merging the best pair of the whole stylesheet first. The two
 * orders give the same output on the framework corpus but not on every input.
 *
 * Termination: a rewrite either shortens the output or moves a rule into the
 * parent of an earlier rule with an equivalent parent, and replacements stay
 * where they are. Neither the length nor the positions can recur, so the
 * sweeps stop once one moves no rule.
 *
 * @param {Root} root
 * @param {ScanOperations} operations
 * @param {ReturnType<typeof createProfileCache>} [cache]
 * @return {void}
 */
export default function runScan(
  root,
  operations,
  cache = createProfileCache()
) {
  const { canMerge, mergeParents, ruleMeta } = operations;

  // Profiles are valid only while a rule's selectors and declarations are
  // unchanged, so they are dropped for every rule a rewrite returns.
  const { profiles, declarationIds } = cache;

  /** @param {Declaration} declaration */
  const declarationId = (declaration) => {
    const key = `${propertyNameKey(declaration.prop)}:${declaration.value}:${declaration.important}`;
    let id = declarationIds.get(key);
    if (id === undefined) {
      id = declarationIds.size;
      declarationIds.set(key, id);
    }
    return id;
  };

  /** @param {Rule} rule @return {RuleProfile} */
  const profileOf = (rule) => {
    const meta = getMeta(rule, ruleMeta);
    let profile = profiles.get(meta);
    if (!profile) {
      const ids = meta.declarations.map(declarationId);
      profile = {
        meta,
        ids,
        idSet: new Set(ids),
      };
      profiles.set(meta, profile);
    }
    return profile;
  };

  /**
   * Orders pairs for merging. For equal selectors it is the number of
   * declarations in both rules, since the selector is written once. Otherwise
   * it is the number of declarations the rules share, or 0 when only a move
   * into an equivalent parent or the removal of empty rules applies.
   *
   * @param {Rule} first
   * @param {Rule} second
   * @return {number} NO_BENEFIT when merging the pair cannot rewrite anything
   */
  const mergeBenefit = (first, second) => {
    const a = profileOf(first);
    const b = profileOf(second);
    if (hasSameSelectors(a.meta, b.meta)) return a.ids.length + b.ids.length;
    const [smaller, larger] =
      a.ids.length <= b.ids.length ? [a, b.idSet] : [b, a.idSet];
    let shared = 0;
    for (const id of smaller.idSet) {
      if (larger.has(id)) shared++;
    }
    if (shared > 0) return shared;
    const rewritesStructure =
      (a.ids.length === 0 && b.ids.length === 0) ||
      (first.parent !== second.parent && sameParent(first, second));
    return rewritesStructure ? 0 : NO_BENEFIT;
  };

  // Pairs that passed `canMerge` as the best candidate but rewrote nothing;
  // they are skipped until another rewrite can change the outcome.
  /** @type {Map<Rule, Rule>} */
  const unmergeablePairs = new Map();

  /** @param {Rule} first @param {Rule} second */
  const pairBenefit = (first, second) =>
    unmergeablePairs.get(first) === second
      ? NO_BENEFIT
      : mergeBenefit(first, second);

  /** @type {WeakMap<Container, boolean>} */
  const outsideDeclarations = new WeakMap();

  /**
   * @param {Rule} first
   * @param {Rule} second
   * @return {{rules: Rule[], moved: boolean} | null} the rules that now stand
   * in place of the pair, or null when nothing changed
   */
  const mergePair = (first, second) => {
    if (
      !canMerge(first, second) ||
      declarationBetween(first, second, outsideDeclarations)
    ) {
      return null;
    }
    // `second` follows `first` and holds no nested rules, so moving it to the
    // end of the equivalent block passes no other rule and leaves the order
    // of the rules unchanged.
    const moved = mergeParents(first, second);
    const rules =
      operations.mergeMatchingDeclarations(first, second) ??
      operations.mergeMatchingSelectors(first, second) ??
      operations.partialMerge(first, second);
    if (rules.length) {
      for (const rule of rules) {
        const meta = ruleMeta.get(rule);
        if (meta) profiles.delete(meta);
      }
      return { rules, moved };
    }
    return moved ? { rules: [first, second], moved } : null;
  };

  let moved;
  do {
    moved = false;
    const list = linkRules(collectRules(root.nodes));
    let current = list.next ?? list;
    /** @type {RuleLink | null} */
    let lookaheadStart = null;
    for (let second = current.next; second; second = current.next) {
      let benefit = pairBenefit(current.rule, second.rule);
      // Move on to the next pair while it shares strictly more declarations,
      // then come back to `lookaheadStart` so the skipped pairs are tried.
      for (let third = second.next; third; third = second.next) {
        const ahead = pairBenefit(second.rule, third.rule);
        if (ahead <= benefit) break;
        lookaheadStart ??= current;
        current = second;
        second = third;
        benefit = ahead;
      }
      const merged =
        benefit === NO_BENEFIT ? null : mergePair(current.rule, second.rule);
      if (!merged) {
        if (lookaheadStart && benefit !== NO_BENEFIT) {
          unmergeablePairs.set(current.rule, second.rule);
          current = lookaheadStart;
        } else {
          current = second;
        }
        lookaheadStart = null;
        continue;
      }
      moved ||= merged.moved;
      unmergeablePairs.clear();
      const replacement = replacePair(current, merged.rules);
      const before = /** @type {RuleLink} */ (replacement.prev);
      if (lookaheadStart) {
        current = lookaheadStart === current ? replacement : lookaheadStart;
      } else {
        current = before.rule ? before : replacement;
      }
      lookaheadStart = null;
    }
    // A move changes which rules share a parent, so rules the sweep already
    // passed may now merge.
  } while (moved);
}
