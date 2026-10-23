import { ValueBuffer } from '../values/valueBuffer.js';
import { sourceValue } from '../utils/declValue.js';
import { contextOf } from './context.js';

/** @import {Container, Document, Helpers, Root} from 'postcss' */
/** @import {Reducer, Stage, TextReducer} from './host.js' */

/**
 * What one run knows about a property: the reducers of its plan, or null when
 * no stage treats it. For each context, a memo from source text to the plan's
 * result, since a value can read its context.
 * @typedef {{plan: readonly Reducer[] | null, memos: (Map<string, string> | undefined)[]}} PropertyEntry
 */

/**
 * What one run knows about a prelude or selector kind: the text reducers of its
 * plan, or null when no stage rewrites it, with a memo per context as above.
 * @typedef {{plan: readonly TextReducer[] | null, memos: (Map<string, string> | undefined)[]}} TextEntry
 */

/**
 * The state of one run. Its entries and contexts live for this run only, so no
 * state crosses stylesheets.
 * @typedef {object} RunState
 * @property {readonly Stage[]} stages in pipeline order
 * @property {Map<string, PropertyEntry>} properties
 * @property {Map<string, TextEntry>} atRules by at-rule name
 * @property {TextEntry} selectors
 * @property {WeakMap<Container | Document, number>} contexts
 * @property {Helpers} helpers
 */

/**
 * @param {readonly Stage[]} stages in pipeline order
 * @param {string} property
 * @returns {PropertyEntry}
 */
function propertyEntry(stages, property) {
  /** @type {Reducer[]} */
  const reducers = [];
  for (const stage of stages) {
    const reducer = stage.forProperty?.(property) ?? null;
    if (reducer !== null) reducers.push(reducer);
  }
  return reducers.length > 0
    ? { plan: reducers, memos: [] }
    : { plan: null, memos: [] };
}

/**
 * @param {readonly TextReducer[]} plan in pipeline order, empty for no stage
 * @returns {TextEntry}
 */
function textEntry(plan) {
  return { plan: plan.length > 0 ? plan : null, memos: [] };
}

/**
 * Looks up the memo of a context, creating it on first use.
 *
 * @param {(Map<string, string> | undefined)[]} memos
 * @param {number} context
 * @returns {Map<string, string>}
 */
function memoOf(memos, context) {
  let memo = memos[context];
  if (memo === undefined) {
    memo = new Map();
    memos[context] = memo;
  }
  return memo;
}

/**
 * Folds a declaration value through its plan. A value that warned is not
 * memoised, so each declaration reports it.
 *
 * @param {PropertyEntry} entry
 * @param {string} text
 * @param {number} context
 * @param {import('postcss').Declaration} decl the declaration that holds the value
 * @param {Helpers} helpers
 * @returns {string}
 */
function reduceValue(entry, text, context, decl, helpers) {
  const plan = /** @type {readonly Reducer[]} */ (entry.plan);
  const memo = memoOf(entry.memos, context);
  let result = memo.get(text);
  if (result !== undefined) return result;
  const buffer = new ValueBuffer(text);
  for (const reducer of plan) reducer(buffer, context);
  result = buffer.finish();
  const warnings = buffer.warnings();
  if (warnings === undefined) {
    memo.set(text, result);
  } else {
    for (const { message, plugin } of warnings) {
      helpers.result.warn(
        message,
        plugin ? { plugin, node: decl } : { node: decl }
      );
    }
  }
  return result;
}

/**
 * Folds the text of a prelude or selector through its plan. A text that
 * warned is not memoised, and its warnings name the node.
 *
 * @param {TextEntry} entry
 * @param {string} text
 * @param {number} context
 * @param {Container} node the at-rule or rule that holds the text
 * @param {Helpers} helpers
 * @returns {string}
 */
function reduceText(entry, text, context, node, helpers) {
  const plan = /** @type {readonly TextReducer[]} */ (entry.plan);
  const memo = memoOf(entry.memos, context);
  const known = memo.get(text);
  if (known !== undefined) return known;
  /** @type {{message: string, plugin: string | undefined}[]} */
  const warnings = [];
  let result = text;
  for (const reduce of plan) {
    result = reduce(result, context, (message, plugin) => {
      warnings.push({ message, plugin });
    });
  }
  if (warnings.length === 0) memo.set(text, result);
  for (const { message, plugin } of warnings) {
    helpers.result.warn(message, plugin ? { plugin, node } : { node });
  }
  return result;
}

/**
 * Folds a declaration value and writes the result only when it changed.
 *
 * @param {RunState} state
 * @param {import('postcss').Declaration} decl
 */
function walkDeclaration(state, decl) {
  let entry = state.properties.get(decl.prop);
  if (entry === undefined) {
    entry = propertyEntry(state.stages, decl.prop);
    state.properties.set(decl.prop, entry);
  }
  if (entry.plan === null) return;
  const context = contextOf(
    /** @type {Container} */ (decl.parent),
    state.contexts
  );
  const text = sourceValue(decl);
  const result = reduceValue(entry, text, context, decl, state.helpers);
  if (result !== text) {
    decl.value = result;
    delete decl.raws.value;
  }
}

/**
 * Folds the prelude of an at-rule and writes the result only when it changed.
 * `@charset` has no plan, since its name and encoding are read in the format
 * phase.
 *
 * @param {RunState} state
 * @param {import('postcss').AtRule} atRule
 */
function walkAtRule(state, atRule) {
  if (atRule.name.toLowerCase() === 'charset') return;
  let entry = state.atRules.get(atRule.name);
  if (entry === undefined) {
    const plan = [];
    for (const stage of state.stages) {
      const reducer = stage.forAtRule?.(atRule.name) ?? null;
      if (reducer !== null) plan.push(reducer);
    }
    entry = textEntry(plan);
    state.atRules.set(atRule.name, entry);
  }
  if (entry.plan === null) return;
  // Preludes and selectors are read without comments, as PostCSS gives them.
  const context = contextOf(atRule, state.contexts);
  const text = atRule.params;
  const result = reduceText(entry, text, context, atRule, state.helpers);
  if (result !== text) {
    atRule.params = result;
    delete atRule.raws.params;
  }
}

/**
 * Folds the selector of a rule and writes the result only when it changed.
 *
 * @param {RunState} state
 * @param {import('postcss').Rule} rule
 */
function walkRule(state, rule) {
  if (state.selectors.plan === null) return;
  // Preludes and selectors are read without comments, as PostCSS gives them.
  const context = contextOf(rule, state.contexts);
  const text = rule.selector;
  const result = reduceText(
    state.selectors,
    text,
    context,
    rule,
    state.helpers
  );
  if (result !== text) {
    rule.selector = result;
    delete rule.raws.selector;
  }
}

/**
 * Runs the value, prelude and selector parts of the stages over a stylesheet in
 * a single walk, in document order. Each text is read from its source, folded
 * through its plan with its context, and written back only when it changed.
 *
 * @param {readonly Stage[]} stages in pipeline order
 * @returns {{run: (root: Root, helpers: Helpers) => void}}
 */
export function declarationTraversal(stages) {
  return {
    run(root, helpers) {
      /** @type {RunState} */
      const state = {
        stages,
        properties: new Map(),
        atRules: new Map(),
        selectors: textEntry(
          stages.flatMap((stage) =>
            stage.selector !== undefined ? [stage.selector] : []
          )
        ),
        contexts: new WeakMap(),
        helpers,
      };
      root.walk((node) => {
        if (node.type === 'decl') walkDeclaration(state, node);
        else if (node.type === 'atrule') walkAtRule(state, node);
        else if (node.type === 'rule') walkRule(state, node);
      });
    },
  };
}
