import { ValueBuffer } from '../values/valueBuffer.js';
import { memoOf } from './memo.js';
import { atRuleEntry, foldPrelude } from './prelude.js';
import { reduceSelector, selectorEntry } from './selectorReduce.js';
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
/** @import {TextEntry} from './prelude.js' */
/** @import {SelectorEntry} from './selectorReduce.js' */
/** @import {FoldedText, TextTable} from '../values/textTable.js' */
/** @import {CommentState} from './comments/nodeComments.js' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * What one run knows about a property: the reducers of its plan, or null when
 * no stage treats it. For each context, a memo from source text to the plan's
 * result, since a value can read its context.
 * `mode` is how the tokenizer reads the values of the property, and `lists` is
 * the token lists of that mode, keyed by text.
 * @typedef {{plan: readonly Reducer[] | null, memos: (Map<string, FoldedText> | undefined)[], mode: import('../values/valueBuffer.js').TokenizeMode | undefined, lists: Map<string, readonly CSSToken[]>}} PropertyEntry
 */

/**
 * The state of one run. Its entries and contexts live for this run only, so no
 * state crosses stylesheets.
 * @typedef {object} RunState
 * @property {readonly Stage[]} stages in pipeline order
 * @property {Map<string, PropertyEntry>} properties
 * @property {Map<string, TextEntry>} atRules by at-rule name
 * @property {SelectorEntry} selectors
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
 * @returns {PropertyEntry}
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
  return reducers.length > 0
    ? { plan: reducers, memos: [], mode, lists }
    : { plan: null, memos: [], mode, lists };
}

/**
 * Folds a declaration value through its plan, then gives the declaration the
 * result, with the tokens a stage read so later readers do not tokenize it. A
 * memo hit is served from the memo. A value that warned is not memoised, so
 * each declaration reports it.
 *
 * @param {PropertyEntry} entry
 * @param {string} text
 * @param {number} context
 * @param {import('postcss').Declaration} decl the declaration that holds the value
 * @param {RunState} state
 */
function reduceValue(entry, text, context, decl, state) {
  const plan = /** @type {readonly Reducer[]} */ (entry.plan);
  const memo = memoOf(entry.memos, context);
  const known = memo.get(text);
  if (known !== undefined) {
    state.table.assignFolded(decl, known);
    return;
  }
  const buffer = new ValueBuffer(text, entry.mode, entry.lists.get(text));
  for (const reducer of plan) reducer(buffer, context);
  const result = buffer.text();
  let tokens;
  if (buffer.isTokenized()) {
    tokens = entry.lists.get(result);
    if (tokens === undefined) {
      tokens = buffer.tokens();
      entry.lists.set(result, tokens);
    }
  }
  const folded = { text: result, tokens };
  const warnings = buffer.warnings();
  if (warnings === undefined) {
    memo.set(text, folded);
  } else {
    for (const { message, plugin } of warnings) {
      state.helpers.result.warn(
        message,
        plugin ? { plugin, node: decl } : { node: decl }
      );
    }
  }
  state.table.assignFolded(decl, folded);
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
  reduceValue(entry, text, context, decl, state);
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
  if (
    !state.defaultNamespace &&
    cssnanoUtils.asciiLowerCase(atRule.name) === 'namespace' &&
    isDefaultNamespace(read)
  ) {
    state.defaultNamespace = true;
  }
  // An at-rule that another plugin built may have no prelude to clean.
  const text =
    comments !== null && read ? commentFreeText(read, comments) : read;
  let result = text;
  let entry;
  /** @type {FoldedText | undefined} */
  let folded;
  if (atRule.name.toLowerCase() !== 'charset') {
    entry = state.atRules.get(atRule.name);
    if (entry === undefined) {
      entry = atRuleEntry(state.stages, atRule.name);
      state.atRules.set(atRule.name, entry);
    }
    if (entry.plan !== null && hasPrelude) {
      const context = contextOf(atRule, state.contexts);
      folded = foldPrelude(entry, text, context, atRule, state.helpers);
      result = folded.text;
    }
  }
  if (folded === undefined) state.table.setText(atRule, result);
  else state.table.assignFolded(atRule, folded);
  if (entry?.tightens && hasPrelude) tightenAfterName(atRule, result);
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
  reduceSelector(
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
    selectors: selectorEntry(
      stages.flatMap((stage) =>
        stage.selector !== undefined ? [stage.selector] : []
      )
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
    }
  });
  // The overridable at-rules are compared after the walk has folded their
  // preludes, so the scopes are the ones the output will have.
  if (state.overridable) discardOverriddenAtRules(state.overridable);
}
