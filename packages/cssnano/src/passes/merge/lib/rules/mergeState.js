import {
  createSelectorLookup,
  selectorsCompatible,
} from './ensureCompatibility.js';
import { createElementKeyLookup } from './elementKeys.js';
import { comma } from '../../../../values/punctuationTokens.js';
import { createRunContext } from '../../../ir/runContext.js';
import { getMeta } from './ruleMeta.js';
import { isKeyframes, sameContainer } from './sameContainer.js';
import { joinRanges } from '../../../../values/joinRanges.js';
import {
  selectorPieces,
  separatorOf,
} from '../../../../values/selectorRanges.js';
import { tokensText } from '../../../../values/tokensText.js';

/** @import {Container, Declaration, Rule} from 'postcss' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
/** @import {RuleMeta} from './ruleMeta.js' */
/** @import {RuleDeclarationKeys} from './ruleMeta.js' */

/** @param {import('postcss').ChildNode} node @return {boolean} */
function isRuleOrAtRule(node) {
  return node.type === 'rule' || node.type === 'atrule';
}

/**
 * The state shared by every merge of one stylesheet.
 */
export default class MergeState {
  /**
   * The keys of the property names this stylesheet's merges compare.
   *
   * @type {PropertyTable}
   */
  properties;
  /** @type {import('./ruleMeta.js').SelectorLookup} */
  #lookup;
  /** @type {WeakSet<Rule>} rules whose selectors are known to be compatible */
  #ruleCache;
  /** @type {WeakMap<Rule, RuleMeta>} */
  #ruleMeta;
  /** @type {import('../../../ir/declarationKey.js').DeclarationKeys} */
  #declarations;
  /** @type {(selector: string, piece?: RangePiece | null) => string | null} */
  #elementKeyOf = createElementKeyLookup();
  /** @type {TextTable} */
  #textTable;
  /** @type {Set<Rule>} rules whose selector text is set, and whose tokens are stored at the end of the run */
  #spelled = new Set();
  // Merging moves only declarations and comments into a rule, so a rule found
  // to hold no rule or at-rule holds none until it is forgotten. A rule that
  // keeps receiving is then not rescanned on every merge.
  /** @type {WeakSet<Rule>} */
  #withoutBlocks = new WeakSet();
  /** @type {Set<Rule> | null} */
  #createdBlocks;
  /**
   * The summaries of the stylesheet's blocks, read by the at-rule joins.
   *
   * @type {import('../../../ir/blockTable.js').BlockTable}
   */
  blocks;

  /** @returns {TextTable} the selector tokens the walk stored */
  get textTable() {
    return this.#textTable;
  }

  /**
   * @param {readonly string[]} browsers
   * @param {import('../../../ir/runContext.js').RunContext} [context] the run's state, shared with dedupe
   */
  constructor(browsers, context = createRunContext()) {
    this.#lookup = createSelectorLookup(
      browsers,
      context.selectorCompatibility,
      context.textTable
    );
    this.#ruleCache = context.compatibleRules;
    this.#ruleMeta = context.ruleMeta;
    this.#declarations = context.declarations;
    this.properties = context.properties;
    this.blocks = context.blocks;
    this.#createdBlocks = context.createdBlocks;
    this.#textTable = context.textTable;
  }

  /**
   * @param {Rule} rule
   * @return {RuleMeta}
   */
  meta(rule) {
    return getMeta(rule, this.#ruleMeta);
  }

  /**
   * Drops the description of a rule whose selectors or declarations changed
   * or that left the stylesheet. It is rebuilt from the rule when next
   * needed, so a rule that was never described stays so.
   *
   * @param {Rule} rule
   */
  forget(rule) {
    this.#ruleMeta.delete(rule);
    this.#withoutBlocks.delete(rule);
  }

  /**
   * @param {Rule} rule
   * @return {boolean} whether the rule holds a rule or an at-rule
   */
  #holdsBlocks(rule) {
    if (this.#withoutBlocks.has(rule)) return false;
    if (rule.some(isRuleOrAtRule)) return true;
    this.#withoutBlocks.add(rule);
    return false;
  }

  /**
   * The elements the rule can match. An arrow function, so it passes as a
   * callback without a closure per call.
   *
   * @param {Rule} rule
   * @return {string[] | null}
   */
  elementKeysOf = (rule) => {
    this.piecesOf(rule);
    return this.meta(rule).elementKeys(this.#elementKeyOf);
  };

  /**
   * Numbers declarations so equal ones, with the same property, value,
   * importance and hack prefix, share a key for the whole run. An arrow
   * function, so it passes as a callback without a closure per call.
   *
   * @param {Declaration} declaration
   * @return {number}
   */
  declarationKey = (declaration) => this.#declarations.keyOf(declaration);

  /**
   * @param {Rule} rule
   * @return {RuleDeclarationKeys}
   */
  declarationKeysOf(rule) {
    return this.meta(rule).declarationKeys(this.declarationKey);
  }

  /**
   * Records that every selector of the rule is compatible with the target
   * browsers, so `canMerge` does not check them again. The caller must have
   * established it: a rule built from selectors that passed `canMerge`
   * qualifies, since a list is compatible exactly when each selector is.
   *
   * @param {Rule} rule
   */
  markCompatible(rule) {
    this.#ruleCache.add(rule);
  }

  /**
   * Reports a rule a merge created, when the run collects them, so the driver
   * canonicalizes it. A rule no run collects is left alone.
   *
   * @param {Rule} rule
   */
  reportCreated(rule) {
    this.#createdBlocks?.add(rule);
  }

  /**
   * Appends selectors of `source` to the rule's selector list, keeping its
   * vendor prefix profile and its token ranges in step.
   *
   * @param {Rule} rule
   * @param {string[]} selectors some of the selectors of `source`, in the
   * order of their first occurrence there
   * @param {Rule} source
   * @return {readonly string[] | null} the element keys the selectors add, or
   * null when the rule's elements are not listed
   */
  addSelectors(rule, selectors, source) {
    const own = this.piecesOf(rule);
    const from = own === null ? null : this.piecesOf(source);
    const pieces =
      from === null
        ? null
        : appendPieces(
            /** @type {RangePiece[]} */ (own),
            selectors,
            this.meta(source).selectors,
            from
          );
    return this.meta(rule).addSelectors(
      selectors,
      this.#lookup,
      this.#elementKeyOf,
      pieces
    );
  }

  /**
   * The token range of each selector of the rule, read from the text table
   * without tokenizing, or null when the table does not hold them.
   *
   * @param {Rule} rule
   * @return {RangePiece[] | null}
   */
  piecesOf(rule) {
    const meta = this.meta(rule);
    if (meta.pieces === undefined) {
      const list = this.#textTable.stored(rule);
      meta.setPieces(
        list === undefined ? null : selectorPieces(list, meta.selectors)
      );
    }
    return /** @type {RangePiece[] | null} */ (meta.pieces);
  }

  /**
   * Sets the selector text of a rule from its list. Its tokens are stored at
   * the end of the run, so a chain of merges into one rule stores them once.
   *
   * @param {Rule} rule
   */
  spellSelectors(rule) {
    this.#textTable.setText(rule, this.meta(rule).selectorText());
    this.#spelled.add(rule);
  }

  /**
   * Stores the tokens of a copy of `rule` made with the rule's selectors. The
   * copy's text is the one PostCSS joined, so the tokens are stored only when
   * they spell it.
   *
   * @param {Rule} rule
   * @param {Rule} clone
   */
  storeClone(rule, clone) {
    const source = this.#textTable.stored(rule);
    if (source === undefined) return;
    this.#storePieces(clone, this.piecesOf(rule), separatorOf(source));
  }

  /**
   * Stores the tokens of a rule joined from the selectors of `first` and
   * `second`, in that order, with a comma between each, as `join()` writes it.
   *
   * @param {Rule} rule
   * @param {Rule} first
   * @param {Rule} second
   */
  storeJoined(rule, first, second) {
    const earlier = this.piecesOf(first);
    const later = this.piecesOf(second);
    if (earlier === null || later === null) return;
    this.#storePieces(rule, earlier.concat(later), [comma()]);
  }

  /**
   * Stores the list the pieces join to, when it spells the rule's selector as
   * it is written. Otherwise the rule keeps its text, and a reader tokenizes it.
   *
   * @param {Rule} rule
   * @param {RangePiece[] | null} pieces
   * @param {readonly CSSToken[]} separator
   */
  #storePieces(rule, pieces, separator) {
    if (pieces === null) return;
    const list = joinRanges(pieces, separator);
    if (tokensText(list) === rule.selector) {
      this.#textTable.record(rule, rule.selector, list);
    }
  }

  /**
   * Stores the tokens of every rule `spellSelectors` set, joined from the
   * pieces its list holds. A rule without pieces keeps its text only, and a
   * reader tokenizes it.
   */
  flushSelectors() {
    for (const rule of this.#spelled) {
      const meta = this.#ruleMeta.get(rule);
      const pieces = meta?.pieces;
      if (!pieces) continue;
      const list = joinRanges(pieces, [comma()]);
      if (tokensText(list) === meta?.selectorText()) {
        this.#textTable.write(rule, list);
      }
    }
    this.#spelled.clear();
  }

  /**
   * Gives `later` the selectors of `earlier`, which stands before it and is
   * dropped by the caller.
   *
   * @param {Rule} later
   * @param {Rule} earlier
   */
  absorbEarlier(later, earlier) {
    // Both lists of pieces are known before the absorb joins them.
    this.piecesOf(earlier);
    this.piecesOf(later);
    this.meta(later).absorbEarlier(
      this.meta(earlier),
      this.#lookup,
      this.#elementKeyOf
    );
  }

  /**
   * Whether the rules can be merged. `parentA` and `parentB` are where the
   * rules stand, which differs from their `parent` for a rule that moved
   * during the sweep.
   *
   * @param {Rule} ruleA
   * @param {Rule} ruleB
   * @param {Container | undefined} [parentA]
   * @param {Container | undefined} [parentB]
   * @return {boolean}
   */
  canMerge(ruleA, ruleB, parentA = ruleA.parent, parentB = ruleB.parent) {
    if (!sameContainer(parentA, parentB, this.#textTable)) return false;
    if (isKeyframes(parentA)) return false;
    if (this.#holdsBlocks(ruleA) || this.#holdsBlocks(ruleB)) return false;

    const metaA = this.meta(ruleA);
    const metaB = this.meta(ruleB);
    // Compatibility holds for a concatenated list exactly when it holds for
    // each side, so a long absorbing list is never rescanned. The vendor check
    // follows it, because an incompatible selector has no known prefix.
    return (
      (this.#ruleCache.has(ruleA) ||
        selectorsCompatible(metaA.selectors, this.#lookup, ruleA)) &&
      (this.#ruleCache.has(ruleB) ||
        selectorsCompatible(metaB.selectors, this.#lookup, ruleB)) &&
      metaA
        .vendorProfile(this.#lookup)
        .allowsMerge(metaB.vendorProfile(this.#lookup))
    );
  }
}

/**
 * Appends to `pieces` the piece of each selector, found in one pass over the
 * source list, since the selectors follow its order.
 *
 * @param {RangePiece[]} pieces grown in place
 * @param {readonly string[]} selectors
 * @param {readonly string[]} sourceSelectors
 * @param {readonly RangePiece[]} sourcePieces one per source selector
 * @return {RangePiece[]}
 */
function appendPieces(pieces, selectors, sourceSelectors, sourcePieces) {
  let index = 0;
  for (const selector of selectors) {
    while (sourceSelectors[index] !== selector) index++;
    pieces.push(sourcePieces[index]);
  }
  return pieces;
}
