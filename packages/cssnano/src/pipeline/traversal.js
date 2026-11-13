import { atRuleEntry } from './prelude.js';
import { foldNode, planEntry } from './plan.js';
import { sourceParams, sourceSelector } from '../utils/sourceText.js';
import cssnanoUtils from '#utils';
import { tightenAfterName } from './afterName.js';
import { reattachBlockEscape } from './whitespaceRaws.js';
import { isDefaultNamespace } from '../plugins/postcss-minify-selectors/lib/isDefaultNamespace.js';
import { contextOf, DEFAULT_NAMESPACE, withBit } from './context.js';
import {
  commentFreeSelector,
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
 * @property {PlanEntry} selectors
 * @property {WeakMap<Container | Document, number>} contexts
 * @property {Helpers} helpers
 * @property {TextTable} table the text table the walk fills
 * @property {CommentState | null} comments the comment removal of this run, or null when no stage removes comments
 * @property {boolean} defaultNamespace whether a default `@namespace` has been reached, so later rules have it in their context
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
  let result = text;
  let entry;
  if (atRule.name.toLowerCase() !== 'charset') {
    entry = state.atRules.get(atRule.name);
    if (entry === undefined) {
      entry = atRuleEntry(state.stages, atRule.name);
      state.atRules.set(atRule.name, entry);
    }
  }
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
  // The prelude as the fold left it, which a stage above may have rewritten.
  if (
    hasPrelude &&
    !state.defaultNamespace &&
    cssnanoUtils.asciiLowerCase(atRule.name) === 'namespace' &&
    isDefaultNamespace(state.table.tokens(atRule))
  ) {
    state.defaultNamespace = true;
  }
}

/**
 * Removes the comments of a rule, then folds its selector through the plan.
 * The selector is read as written and written back only when it changed.
 *
 * @param {RunState} state
 * @param {import('postcss').Rule} rule
 */
function walkRule(state, rule) {
  const { comments } = state;
  if (comments !== null) removeBetweenComments(rule, comments);
  if (comments === null && state.selectors.plan === null) return;
  const read = sourceSelector(rule);
  const text = comments !== null ? commentFreeSelector(read, comments) : read;
  if (state.selectors.plan === null) {
    if (text !== read) state.table.setText(rule, text);
    return;
  }
  let context = contextOf(rule, state.contexts);
  if (state.defaultNamespace) context = withBit(context, DEFAULT_NAMESPACE);
  foldNode(
    state.selectors,
    rule,
    read,
    text,
    context,
    state.helpers,
    state.table
  );
}

/**
 * Runs the comment, prelude and selector parts of the stages over a stylesheet
 * in a single walk, in document order. Each node loses its comments first, then
 * each text is read from its source, folded through its plan with its context,
 * and written back only when it changed. Declarations are left to the record
 * walk.
 *
 * @param {readonly Stage[]} stages in pipeline order
 * @param {Root} root
 * @param {Helpers} helpers
 * @param {ReadonlyMap<string, unknown>} transforms the whole-stylesheet transforms of the run, by entry name
 * @param {TextTable} table the selector and at-rule tokens the walk leaves for later readers
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
    selectors: planEntry(
      stages.flatMap((stage) =>
        stage.selector !== undefined ? [stage.selector] : []
      ),
      undefined,
      false
    ),
    contexts: new WeakMap(),
    helpers,
    table,
    comments,
    defaultNamespace: false,
    normalizeWhitespace: transforms.has('normalizeWhitespace'),
  };
  root.walk((node) => {
    if (node.type === 'comment') {
      if (state.comments?.canRemove(node.text)) node.remove();
    } else if (node.type === 'atrule') {
      if (state.normalizeWhitespace) reattachBlockEscape(node);
      walkAtRule(state, node);
    } else if (node.type === 'rule') {
      if (state.normalizeWhitespace) reattachBlockEscape(node);
      walkRule(state, node);
    }
  });
}
