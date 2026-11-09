/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */

/*
 * What an entry is, as a small integer. The window between build and
 * write-back reads these instead of the node's type, name and params.
 */
export const STYLESHEET = 0;
export const RULE = 1;
export const DECLARATION = 2;
export const COMMENT = 3;
export const AT_RULE_BLOCK = 4;
export const AT_RULE_STATEMENT = 5;

/*
 * The category of an at-rule, held by the two at-rule kinds and by the
 * neutral value of the others.
 */
export const NO_AT_RULE = 0;
export const CONDITIONAL_GROUP = 1;
export const LAYER = 2;
export const KEYFRAMES = 3;
export const IMPORT = 4;
export const OTHER_AT_RULE = 5;

/**
 * The place of an entry in the arena of a run's records. It stays the same
 * while the entry moves between chains, unlike its chain position.
 *
 * @typedef {number & {readonly brand: unique symbol}} ArenaIndex
 */

/**
 * The place of an entry in the ordered children read from a chain, counted
 * from 0. It changes whenever an entry before it is linked or unlinked.
 *
 * @typedef {number & {readonly brand: unique symbol}} ChainPosition
 */

/** The id of an entry that has no prelude. */
export const NO_PRELUDE = -1;

const CONDITIONAL_GROUP_NAMES = new Set(['media', 'supports', 'container']);

/**
 * The category of an at-rule from its folded name. Conditional groups hold
 * rules whose declarations cascade as they do at the top level. A keyframes is
 * any name that contains `keyframes`, vendor prefixes included.
 *
 * @param {string} name the name, folded by `asciiLowerCase`
 * @return {number} one of the at-rule categories
 */
export function atRuleKindOf(name) {
  if (CONDITIONAL_GROUP_NAMES.has(name)) return CONDITIONAL_GROUP;
  if (name === 'layer') return LAYER;
  if (name.includes('keyframes')) return KEYFRAMES;
  if (name === 'import') return IMPORT;
  return OTHER_AT_RULE;
}

/**
 * @param {number} kind
 * @return {boolean} whether the kind is an at-rule with a block or a statement at-rule
 */
export function isAtRuleKind(kind) {
  return kind === AT_RULE_BLOCK || kind === AT_RULE_STATEMENT;
}

/**
 * @param {number} kind
 * @return {boolean} whether an entry of the kind is a rule, an at-rule or the stylesheet, not a declaration or a comment
 */
export function isRuleOrAtRuleKind(kind) {
  return kind !== DECLARATION && kind !== COMMENT;
}

/**
 * The record of a container that the merge visits: the stylesheet, an at-rule
 * with a block, or a rule that holds rules or at-rules. Its children are the
 * entries its chain links, which `BlockRecords` keeps. Every record class holds
 * the same facts, with neutral values where they do not apply.
 */
export class BlockRecord {
  /** @type {typeof STYLESHEET | typeof AT_RULE_BLOCK} what the block is */
  kind;

  /** @type {number} the category of an at-rule, NO_AT_RULE for the stylesheet */
  atRuleKind;

  /** @type {string} the folded name of an at-rule, '' for the stylesheet */
  name;

  /** @type {string} the prelude of an at-rule, '' for the stylesheet */
  params;

  /** @type {boolean} whether the block is a layer with no name, or only comments as its prelude */
  anonymous;

  /** @type {number} the interned id of the at-rule's prelude, or NO_PRELUDE */
  preludeId;

  /**
   * The whitespace before the block, as its node's `raws.before` gives it at
   * the build, or null when the node has none and the printer infers it;
   * write-back assigns the value a merge gives the record.
   *
   * @type {string | null}
   */
  before = '';

  /** @type {boolean} whether the block applies nothing once it is empty */
  droppable;

  /** @type {ArenaIndex} the place of the block in the arena of its records, -1 until added */
  index = /** @type {ArenaIndex} */ (-1);

  /**
   * The id of the circumstances under which the block applies its content, as
   * `containerContext` gives it. A block moves only between equal containers,
   * so the id holds for the whole run.
   *
   * @type {number}
   */
  context = -1;

  /**
   * The whitespace before the first child of the stylesheet, which PostCSS
   * hands on when that child is removed. Only the record of the stylesheet
   * holds it.
   *
   * @type {string | null}
   */
  leadingWhitespace = null;

  /**
   * @param {typeof STYLESHEET | typeof AT_RULE_BLOCK} kind
   * @param {number} atRuleKind the category of the at-rule, NO_AT_RULE for the stylesheet
   * @param {string} name the folded name, or ''
   * @param {string} params the prelude, or ''
   * @param {boolean} anonymous
   * @param {number} preludeId
   */
  constructor(kind, atRuleKind, name, params, anonymous, preludeId) {
    this.kind = kind;
    this.atRuleKind = atRuleKind;
    this.name = name;
    this.params = params;
    this.anonymous = anonymous;
    this.preludeId = preludeId;
    // A conditional group is dropped when empty, and so is a named layer.
    this.droppable =
      atRuleKind === CONDITIONAL_GROUP || (atRuleKind === LAYER && !anonymous);
  }
}

/**
 * A child of a block that is neither a rule, an at-rule with a block, nor a
 * declaration: a comment or a statement at-rule. It takes an index in the arena
 * so that a block's children hold indices alone.
 */
export class NodeEntry {
  /** @type {typeof COMMENT | typeof AT_RULE_STATEMENT} what the entry is */
  kind;

  /** @type {ArenaIndex} the place of the entry in the arena, -1 until added */
  index = /** @type {ArenaIndex} */ (-1);

  /** @type {string | null} the whitespace before the node, see `BlockRecord#before` */
  before;

  /** @type {number} the category of the at-rule, NO_AT_RULE for a comment */
  atRuleKind;

  /** @type {string} the folded name of an at-rule, '' for a comment */
  name;

  /** @type {string} the prelude of an at-rule, '' for a comment */
  params;

  /** @type {boolean} whether a layer statement is anonymous */
  anonymous;

  /** @type {number} the interned id of the at-rule's prelude, or NO_PRELUDE */
  preludeId;

  /** @type {string} the text of a comment, '' for an at-rule */
  text;

  /** @type {boolean} whether a comment is important, which the merge keeps */
  important;

  /**
   * @param {typeof COMMENT | typeof AT_RULE_STATEMENT} kind
   * @param {string | null} before
   * @param {number} atRuleKind the category of the at-rule, NO_AT_RULE for a comment
   * @param {string} name
   * @param {string} params
   * @param {boolean} anonymous
   * @param {number} preludeId
   * @param {string} [text] the text of a comment
   * @param {boolean} [important] whether a comment is important
   */
  constructor(
    kind,
    before,
    atRuleKind,
    name,
    params,
    anonymous,
    preludeId,
    text = '',
    important = false
  ) {
    this.kind = kind;
    this.before = before;
    this.atRuleKind = atRuleKind;
    this.name = name;
    this.params = params;
    this.anonymous = anonymous;
    this.preludeId = preludeId;
    this.text = text;
    this.important = important;
  }
}
