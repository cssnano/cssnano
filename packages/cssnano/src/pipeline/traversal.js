import { atRuleEntry } from './prelude.js';
import { foldNode } from './plan.js';
import { sourceParams } from '../utils/sourceText.js';
import { tightenAfterName } from './afterName.js';
import { reattachBlockEscape } from './whitespaceRaws.js';
import { contextOf } from './context.js';
import {
  commentFreeText,
  removeAfterNameComments,
  removeBetweenComments,
} from './comments/nodeComments.js';

/** @import {AtRule, Container, Document, Helpers, Root, Rule} from 'postcss' */
/** @import {Stage} from './host.js' */
/** @import {PlanEntry} from './plan.js' */
/** @import {TextTable} from '../values/textTable.js' */
/** @import {CommentState} from './comments/nodeComments.js' */

/**
 * The state of one run. Its entries and contexts live for this run only, so no
 * state crosses stylesheets.
 * @typedef {object} RunState
 * @property {readonly Stage[]} stages in pipeline order
 * @property {Map<string, PlanEntry>} atRules by at-rule name
 * @property {WeakMap<Container | Document, number>} contexts
 * @property {Helpers} helpers
 * @property {TextTable} table the text table the walk fills
 * @property {CommentState | null} comments the comment removal of this run, or null when no stage removes comments
 * @property {boolean} normalizeWhitespace whether normalizeWhitespace is on, which reattaches the escapes of blocks
 */

/**
 * Removes the comments of an at-rule, then folds its prelude through its plan.
 * The prelude is read as written and written back only when it changed.
 * `@charset` has no plan, since its name and encoding are read in the format
 * phase. A prelude that PostCSS gives as empty is not folded.
 *
 * @param {RunState} state
 * @param {import('postcss').AtRule} atRule
 */
function walkAtRule(state, atRule) {
  const { comments } = state;
  if (comments !== null) {
    removeBetweenComments(atRule, comments);
    removeAfterNameComments(atRule, comments);
  }
  const read = sourceParams(atRule);
  const hasPrelude = Boolean(atRule.params);
  // An at-rule that another plugin built may have no prelude to clean.
  const text =
    comments !== null && read ? commentFreeText(read, comments) : read;
  let entry;
  if (atRule.name.toLowerCase() !== 'charset') {
    entry = state.atRules.get(atRule.name);
    if (entry === undefined) {
      entry = atRuleEntry(state.stages, atRule.name);
      state.atRules.set(atRule.name, entry);
    }
  }
  let result = text;
  let startsBalanced = false;
  if (entry !== undefined && entry.plan !== null && hasPrelude) {
    const context = contextOf(atRule, state.contexts);
    const folded = foldNode(
      entry,
      atRule,
      read,
      text,
      context,
      state.helpers,
      state.table
    );
    result = folded.text;
    startsBalanced = folded.tightAfterName === true;
  } else if (text !== read) {
    state.table.setText(atRule, text);
  }
  if (entry?.tightens && hasPrelude) {
    tightenAfterName(atRule, result, startsBalanced);
  }
}

/**
 * Runs the comment and at-rule parts of the stages over a stylesheet in a single
 * walk, in document order. Each comment that the comment removal accepts goes.
 * Each at-rule loses its comments first, then its prelude is read from its
 * source, folded through its plan with its context, and written back only when
 * it changed. Rules and declarations are left to the record walk.
 *
 * @param {readonly Stage[]} stages in pipeline order
 * @param {Root} root
 * @param {Helpers} helpers
 * @param {ReadonlyMap<string, unknown>} transforms the whole-stylesheet transforms of the run, by entry name
 * @param {TextTable} table the at-rule tokens the walk leaves for later readers
 * @param {CommentState | null} comments the comment removal of the stylesheet, or null when no stage removes comments
 */
export function walkStylesheet(
  stages,
  root,
  helpers,
  transforms,
  table,
  comments
) {
  /** @type {RunState} */
  const state = {
    stages,
    atRules: new Map(),
    contexts: new WeakMap(),
    helpers,
    table,
    comments,
    normalizeWhitespace: transforms.has('normalizeWhitespace'),
  };
  root.walk((node) => {
    if (node.type === 'comment') {
      if (state.comments?.canRemove(node.text)) node.remove();
    } else if (node.type === 'atrule') {
      if (state.normalizeWhitespace) reattachBlockEscape(node);
      walkAtRule(state, node);
    } else if (node.type === 'rule' && state.normalizeWhitespace) {
      reattachBlockEscape(node);
    }
  });
}
