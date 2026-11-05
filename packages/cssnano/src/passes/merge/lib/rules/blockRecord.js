/** @import {ChildNode, Container} from 'postcss' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */

/*
 * What a record is, as a small integer. The window between build and
 * write-back reads these instead of the node's type, name and params.
 */
export const STYLESHEET = 0;
export const RULE = 1;
export const DECLARATION = 2;
export const COMMENT = 3;
export const CONDITIONAL_GROUP = 4;
export const LAYER = 5;
export const KEYFRAMES = 6;
export const IMPORT = 7;
export const OTHER_AT_RULE = 8;

/** The id of an entry that has no prelude. */
export const NO_PRELUDE = -1;

const CONDITIONAL_GROUP_NAMES = new Set(['media', 'supports', 'container']);

/**
 * The kind of an at-rule from its folded name. Conditional groups hold rules
 * whose declarations cascade as they do at the top level. A keyframes is any
 * name that contains `keyframes`, vendor prefixes included.
 *
 * @param {string} name the name, folded by `asciiLowerCase`
 * @return {number} one of the at-rule kinds
 */
export function atRuleKind(name) {
  if (CONDITIONAL_GROUP_NAMES.has(name)) return CONDITIONAL_GROUP;
  if (name === 'layer') return LAYER;
  if (name.includes('keyframes')) return KEYFRAMES;
  if (name === 'import') return IMPORT;
  return OTHER_AT_RULE;
}

/**
 * @param {number} kind
 * @return {boolean} whether the kind is one of an at-rule
 */
export function isAtRuleKind(kind) {
  return kind >= CONDITIONAL_GROUP;
}

/**
 * The record of a container that the merge visits: the stylesheet, an at-rule
 * with a block, or a rule that holds rules or at-rules. Its children are the
 * entries its chain links, which `BlockRecords` keeps. Every record class holds
 * the same facts, with neutral values where they do not apply.
 */
export class BlockRecord {
  /** @type {Container} */
  node;

  /** @type {number} what the block is, one of the kinds of this module */
  kind;

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
   * the build; write-back assigns the value a merge gives the record.
   *
   * @type {string | undefined}
   */
  before = '';

  /** @type {boolean} whether the block applies nothing once it is empty */
  droppable;

  /**
   * The first entry of the chain of live children, which `BlockRecords` links,
   * or -1 when the block holds none.
   *
   * @type {number}
   */
  first = -1;

  /**
   * The last entry of the chain of live children, or -1 when the block holds
   * none.
   *
   * @type {number}
   */
  last = -1;

  /**
   * The number of entries in the chain, kept by each link and unlink.
   *
   * @type {number}
   */
  count = 0;

  /** @type {number} the place of the block in the arena of its records, -1 until added */
  index = -1;

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
   * @type {string | undefined}
   */
  leadingWhitespace = undefined;

  /**
   * @param {Container} node
   * @param {number} kind
   * @param {string} name the folded name, or ''
   * @param {string} params the prelude, or ''
   * @param {boolean} anonymous
   * @param {number} preludeId
   */
  constructor(node, kind, name, params, anonymous, preludeId) {
    this.node = node;
    this.kind = kind;
    this.name = name;
    this.params = params;
    this.anonymous = anonymous;
    this.preludeId = preludeId;
    // A conditional group is dropped when empty, and so is a named layer.
    this.droppable =
      kind === CONDITIONAL_GROUP || (kind === LAYER && !anonymous);
  }
}

/**
 * A child of a block that is neither a rule, an at-rule with a block, nor a
 * declaration: a comment or a statement at-rule. It takes an index in the arena
 * so that a block's children hold indices alone.
 */
export class NodeEntry {
  /** @type {ChildNode} the node the entry stands for */
  node;

  /** @type {number} the place of the entry in the arena, -1 until added */
  index = -1;

  /** @type {number} what the entry is, a comment or an at-rule kind */
  kind;

  /** @type {string} the folded name of an at-rule, '' for a comment */
  name;

  /** @type {string} the prelude of an at-rule, '' for a comment */
  params;

  /** @type {boolean} whether a layer statement is anonymous */
  anonymous;

  /** @type {number} the interned id of the at-rule's prelude, or NO_PRELUDE */
  preludeId;

  /** @type {string | undefined} the whitespace before the node, see `BlockRecord#before` */
  before = '';

  /**
   * @param {ChildNode} node
   * @param {number} kind
   * @param {string} name
   * @param {string} params
   * @param {boolean} anonymous
   * @param {number} preludeId
   */
  constructor(node, kind, name, params, anonymous, preludeId) {
    this.node = node;
    this.kind = kind;
    this.name = name;
    this.params = params;
    this.anonymous = anonymous;
    this.preludeId = preludeId;
  }
}
