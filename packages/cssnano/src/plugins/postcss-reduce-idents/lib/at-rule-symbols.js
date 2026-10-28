import addToCache from './cache.js';
import {
  atRuleIdent,
  collectOpaqueIdents,
  tokenEdits,
  TokenType,
} from './value.js';
import { resolveAtRule, resolveProperty } from './slots.js';
import { declaredValueTokens } from '../../../values/declaredValueTokens.js';
import { identifierWithText } from '../../../values/tokenConstructors.js';
import { ValueBuffer } from '../../../values/valueBuffer.js';

/** @import {TextTable} from '../../../values/textTable.js' */
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
 * The identifier token that spells an encoded name, as the encoder wrote it.
 *
 * @param {string} name
 * @return {CSSToken}
 */
function encodedIdent(name) {
  return identifierWithText(name, name);
}

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
    /**
     * @param {import('postcss').AnyNode} node
     * @param {TextTable} table
     */
    collect(node, table) {
      if (node.type === 'atrule' && resolveAtRule(node.name) === atRule) {
        const name = atRuleIdent(table.tokens(node));
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
    /** @param {TextTable} table */
    transform(table) {
      const defined = new Set(atRules.map((entry) => entry.name));
      const opaque = new Set();
      /** @type {Map<import('postcss').Declaration, readonly CSSToken[]>} */
      const parsedValues = new Map();
      const tokenCache = new Map();
      for (const { node } of references) {
        const parsedTokens = declaredValueTokens(table, node, tokenCache);
        parsedValues.set(node, parsedTokens);
        collectOpaqueIdents(node.value, opaque, parsedTokens);
      }
      const referenced = new Set();
      for (const { node, functionProperty } of references) {
        const parsedTokens = /** @type {readonly CSSToken[]} */ (
          parsedValues.get(node)
        );
        const edits = tokenEdits(
          parsedTokens,
          (token, position) => {
            if (token[0] !== TokenType.Ident) return;
            if (position !== (functionProperty ? 'argument' : 'bare')) return;
            const name = token[4].value;
            if (!defined.has(name) || opaque.has(name)) return;
            referenced.add(name);
            return encodedIdent(cache.get(name));
          },
          functionProperty ? functions : undefined
        );
        if (edits.length === 0) continue;
        const buffer = new ValueBuffer(node.value, undefined, parsedTokens);
        buffer.replaceRanges(edits);
        // Keep the raw of a value that renaming left as it was.
        if (buffer.text() !== node.value) table.write(node, buffer.tokens());
      }
      for (const { name, rule } of atRules) {
        const encoded = cache.get(name);
        if (referenced.has(name) && encoded !== rule.params) {
          table.write(rule, [encodedIdent(encoded)]);
        }
      }
      atRules = [];
      references = [];
    },
  };
}
