import { atRuleEntry } from './prelude.js';
import { foldNode, planEntry } from './plan.js';
import { tokenizeMode } from '../values/tokenizeMode.js';
import {
  sourceParams,
  sourceSelector,
  sourceValue,
} from '../utils/sourceText.js';
import cssnanoUtils from '#utils';
import { tightenAfterName } from './afterName.js';
import {
  reattachBlockEscape,
  stripStrayRawSemicolon,
} from './whitespaceRaws.js';
import { isDefaultNamespace } from '../plugins/postcss-minify-selectors/lib/isDefaultNamespace.js';
import {
  discardOverriddenAtRules,
  isOutermostOverridable,
} from './overridable.js';
import { contextOf, DEFAULT_NAMESPACE, withBit } from './context.js';
import {
  commentFreeSelector,
  commentFreeText,
  removeAfterNameComments,
  removeBetweenComments,
  removeImportantComments,
} from './comments/nodeComments.js';

/** @import {AtRule, Container, Document, Helpers, Root} from 'postcss' */
/** @import {Reducer, Stage} from './host.js' */
/** @import {PlanEntry} from './plan.js' */
/** @import {TextTable} from '../values/textTable.js' */
/** @import {CommentState} from './comments/nodeComments.js' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * The state of one run. Its entries and contexts live for this run only, so no
 * state crosses stylesheets.
 * @typedef {object} RunState
 * @property {readonly Stage[]} stages in pipeline order
 * @property {Map<string, PlanEntry>} properties
 * @property {Map<string, PlanEntry>} atRules by at-rule name
 * @property {PlanEntry} selectors
 * @property {WeakMap<Container | Document, number>} contexts
 * @property {Helpers} helpers
 * @property {TextTable} table the text table the walk fills
 * @property {{plain: Map<string, readonly CSSToken[]>, unicodeRange: Map<string, readonly CSSToken[]>}} valueLists the token lists of the values, by tokenizer mode
 * @property {CommentState | null} comments the comment removal of this run, or null when no stage removes comments
 * @property {boolean} defaultNamespace whether a default `@namespace` has been reached, so later rules have it in their context
 * @property {boolean} normalizeWhitespace whether normalizeWhitespace is on, which removes the stray semicolons and reattaches the escapes of blocks
 * @property {AtRule[] | null} overridable the outermost overridable at-rules in document order, or null when discardOverridden is off
 */

/**
 * @param {readonly Stage[]} stages in pipeline order
 * @param {string} property
 * @param {RunState['valueLists']} valueLists
 * @returns {PlanEntry}
 */
function propertyEntry(stages, property, valueLists) {
  /** @type {Reducer[]} */
  const reducers = [];
  for (const stage of stages) {
    const reducer = stage.forProperty?.(property) ?? null;
    if (reducer !== null) reducers.push(reducer);
  }
  const mode = tokenizeMode(property);
  const lists = mode === undefined ? valueLists.plain : valueLists.unicodeRange;
  return planEntry(reducers, mode, lists, false);
}

/**
 * Removes the comments of a declaration, then folds its value through its plan.
 * The value is read as written, without the comments that go, and written back
 * only when it differs from what was read.
 *
 * @param {RunState} state
 * @param {import('postcss').Declaration} decl
 */
function walkDeclaration(state, decl) {
  if (state.normalizeWhitespace && !decl.prop.startsWith('--')) {
    stripStrayRawSemicolon(decl);
  }
  let entry = state.properties.get(decl.prop);
  if (entry === undefined) {
    entry = propertyEntry(state.stages, decl.prop, state.valueLists);
    state.properties.set(decl.prop, entry);
  }
  const { comments } = state;
  if (comments === null && entry.plan === null) return;
  const read = sourceValue(decl);
  let text = read;
  if (comments !== null) {
    removeBetweenComments(decl, comments);
    text = commentFreeText(read, comments, decl.prop.startsWith('--'));
    removeImportantComments(decl, comments);
  }
  if (entry.plan === null) {
    if (text !== read) state.table.setText(decl, text);
    return;
  }
  const context = contextOf(
    /** @type {Container} */ (decl.parent),
    state.contexts
  );
  foldNode(entry, decl, read, text, context, state.helpers, state.table);
}

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
 * Moves the comments PostCSS kept only in the raw selector into the selector,
 * as PostCSS itself does for a comment with no whitespace beside it. Later
 * transforms rebuild selectors from `rule.selectors`, which would otherwise
 * lose them.
 *
 * @param {import('postcss').Rule} rule
 */
function keepSelectorComments(rule) {
  const raw = rule.raws.selector;
  if (raw === undefined || raw.value !== rule.selector) return;
  rule.selector = raw.raw;
  delete rule.raws.selector;
}

/**
 * The comment removal of a stylesheet, from the first stage that has one.
 *
 * @param {readonly Stage[]} stages
 * @returns {CommentState | null} null when no stage removes comments
 */
function commentStateOf(stages) {
  for (const stage of stages) {
    if (stage.comments !== undefined) {
      return { canRemove: stage.comments(), parserCache: new Map() };
    }
  }
  return null;
}

/**
 * Runs the comment, value, prelude and selector parts of the stages over a
 * stylesheet in a single walk, in document order. Each node loses its comments
 * first, then each text is read from its source, folded through its plan with
 * its context, and written back only when it changed.
 *
 * @param {readonly Stage[]} stages in pipeline order
 * @param {Root} root
 * @param {Helpers} helpers
 * @param {ReadonlyMap<string, unknown>} transforms the whole-stylesheet transforms of the run, by entry name
 * @param {TextTable} table the selector and value tokens the walk leaves for later readers
 */
export function walkStylesheet(stages, root, helpers, transforms, table) {
  /** @type {RunState} */
  const state = {
    stages,
    properties: new Map(),
    atRules: new Map(),
    selectors: planEntry(
      stages.flatMap((stage) =>
        stage.selector !== undefined ? [stage.selector] : []
      ),
      undefined,
      null,
      false
    ),
    contexts: new WeakMap(),
    helpers,
    table,
    valueLists: { plain: new Map(), unicodeRange: new Map() },
    comments: commentStateOf(stages),
    defaultNamespace: false,
    normalizeWhitespace: transforms.has('normalizeWhitespace'),
    overridable: transforms.has('discardOverridden') ? [] : null,
  };
  root.walk((node) => {
    if (node.type === 'comment') {
      if (state.comments?.canRemove(node.text)) node.remove();
    } else if (node.type === 'decl') walkDeclaration(state, node);
    else if (node.type === 'atrule') {
      if (state.normalizeWhitespace) reattachBlockEscape(node);
      if (state.overridable && isOutermostOverridable(node)) {
        state.overridable.push(node);
      }
      walkAtRule(state, node);
    } else if (node.type === 'rule') {
      if (state.normalizeWhitespace) reattachBlockEscape(node);
      walkRule(state, node);
      keepSelectorComments(node);
    }
  });
  // The overridable at-rules are compared after the walk has folded their
  // preludes, so the scopes are the ones the output will have.
  if (state.overridable) discardOverriddenAtRules(state.overridable);
}
