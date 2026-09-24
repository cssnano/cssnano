import addToCache from './cache.js';
import {
  atRuleIdent,
  collectOpaqueIdents,
  rewrite,
  tokens,
  TokenType,
} from './value.js';
import { resolveAtRule, resolveProperty } from './slots.js';

/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */

/**
 * Name the slots of an at-rule-defined name: where it is defined, what
 * references it, and which keywords are not names.
 *
 * @typedef {{
 *   atRule: string,
 *   reserved: Set<string>,
 *   properties: Set<string>,
 *   functionProperties?: Set<string>,
 *   functions?: Map<string, number[]>,
 *   descriptors?: Set<string>,
 * }} AtRuleSymbols
 */

/**
 * Rename the names an at-rule defines and declaration values reference,
 * such as `@keyframes` names. Rename only when definition and reference
 * occur in the same document; names are case-sensitive custom identifiers.
 *
 * @param {AtRuleSymbols} slots
 * @param {(value: string, index: number) => string} encoder
 */
export default function atRuleReducer(
  { atRule, reserved, properties, functionProperties, functions, descriptors },
  encoder
) {
  const cache = new Map();
  /** @type {{name: string, rule: import('postcss').AtRule}[]} */
  let atRules = [];
  /** @type {{node: import('postcss').Declaration, property: string, functionProperty: boolean}[]} */
  let references = [];

  return {
    /** @param {import('postcss').AnyNode} node */ collect(node) {
      if (node.type === 'atrule' && resolveAtRule(node.name) === atRule) {
        const name = atRuleIdent(node.params);
        if (name !== undefined && !reserved.has(name.toLowerCase())) {
          addToCache(name, encoder, cache);
          atRules.push({ name, rule: node });
        }
      }
      if (node.type !== 'decl') return;
      const property = resolveProperty(node.prop);
      const functionProperty = functionProperties?.has(property) ?? false;
      if (
        properties.has(property) ||
        functionProperty ||
        (node.parent?.type === 'atrule' &&
          resolveAtRule(node.parent.name) === atRule &&
          descriptors?.has(node.prop.toLowerCase()))
      ) {
        references.push({ node, property, functionProperty });
      }
    },
    transform() {
      const defined = new Set(atRules.map((entry) => entry.name));
      const opaque = new Set();
      /** @type {Map<import('postcss').Declaration, CSSToken[]>} */
      const parsedValues = new Map();
      for (const { node } of references) {
        const parsedTokens = tokens(node.value);
        parsedValues.set(node, parsedTokens);
        collectOpaqueIdents(node.value, opaque, parsedTokens);
      }
      const referenced = new Set();
      for (const { node, functionProperty } of references) {
        node.value = rewrite(
          node.value,
          (token, position) => {
            if (token[0] !== TokenType.Ident) return;
            if (position !== (functionProperty ? 'argument' : 'bare')) return;
            const name = token[4].value;
            if (!defined.has(name) || opaque.has(name)) return;
            referenced.add(name);
            return cache.get(name);
          },
          functionProperty ? functions : undefined,
          parsedValues.get(node)
        );
      }
      for (const { name, rule } of atRules) {
        if (referenced.has(name)) rule.params = cache.get(name);
      }
      atRules = [];
      references = [];
    },
  };
}
