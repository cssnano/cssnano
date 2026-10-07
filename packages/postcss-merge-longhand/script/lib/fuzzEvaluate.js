import postcss from 'postcss';
import {
  TokenType,
  tokenize as tokenizeProperty,
} from '@csstools/css-tokenizer';
import { expand } from './fuzzExpand.js';
import { initialState } from './fuzzModel.js';

/**
 * An independent evaluator for what a rule means to the browser.
 *
 * Deliberately shares nothing with the plugin: not `src/lib/spec.js`, not the
 * generated `longhands.json`, not `parseWsc` or `parseTrbl`.
 *
 */

/**
 * Decodes a property identifier
 *
 * @param {string} property
 * @return {string}
 */
function propertyName(property) {
  if (!property.includes('\\')) return property.toLowerCase();
  const propertyTokens = [...tokenizeProperty({ css: property })];
  const [token, eof] = propertyTokens;
  if (
    propertyTokens.length === 2 &&
    token?.[0] === TokenType.Ident &&
    eof?.[0] === TokenType.EOF
  ) {
    return /** @type {{value: string}} */ (token[4]).value.toLowerCase();
  }
  return property.toLowerCase();
}

/**
 * Folds a rule's declarations into the state they leave behind.
 *
 * @param {import('postcss').Rule} rule
 * @return {Map<string, string>}
 */
function evaluateRule(rule) {
  const state = initialState();

  for (const important of [false, true]) {
    for (const node of rule.nodes) {
      if (node.type !== 'decl' || Boolean(node.important) !== important) {
        continue;
      }

      const slots = expand(propertyName(node.prop), node.value);

      if (slots === undefined) {
        continue;
      }

      for (const [slot, value] of slots) {
        state.set(slot, value);
      }
    }
  }

  return state;
}

/**
 * @param {string} css
 * @return {Map<string, string>[]} one state per rule, in document order.
 */
function evaluate(css) {
  /** @type {Map<string, string>[]} */
  const states = [];

  postcss.parse(css).walkRules((rule) => {
    states.push(evaluateRule(rule));
  });

  return states;
}

/**
 * @param {Map<string, string>} expected
 * @param {Map<string, string>} actual
 * @return {{slot: string, expected: string, actual: string}[]}
 */
function differences(expected, actual) {
  /** @type {{slot: string, expected: string, actual: string}[]} */
  const found = [];

  for (const [slot, value] of expected) {
    const other = actual.get(slot);

    if (other !== value) {
      found.push({ slot, expected: value, actual: other ?? '<missing>' });
    }
  }

  return found;
}

export { differences, evaluate, initialState };
