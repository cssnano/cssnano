import addToCache from './cache.js';
import {
  atRuleIdent,
  collectOpaqueIdents,
  encodedIdent,
  tokenEdits,
  TokenType,
} from './value.js';
import { resolveAtRule, resolveProperty } from './slots.js';
import {
  atRuleAt,
  declaredValue,
  declaredValueTokens,
  preludeListOf,
  preludeTextOf,
} from '../../../passes/ir/declaredText.js';
import {
  AT_RULE_BLOCK,
  AT_RULE_STATEMENT,
  DECLARATION,
} from '../../../passes/ir/blockRecord.js';
import { writePrelude } from '../../../passes/ir/arenaEdits.js';
import { writeValue } from '../../../passes/ir/valueEdits.js';
import { ValueBuffer } from '../../../values/valueBuffer.js';

/** @import {ArenaIndex} from '../../../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../../passes/ir/blockRecords.js' */
/** @import {RunContext} from '../../../passes/ir/runContext.js' */
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
  /** @type {{name: string, rule: ArenaIndex}[]} */
  let atRules = [];
  /** @type {{index: ArenaIndex, property: string, functionProperty: boolean}[]} */
  let references = [];

  return {
    /**
     * @param {ArenaIndex} index
     * @param {BlockRecords} records
     * @param {RunContext} context
     */
    collect(index, records, context) {
      const entry = records.entry(index);
      if (entry.kind === AT_RULE_BLOCK || entry.kind === AT_RULE_STATEMENT) {
        if (resolveAtRule(entry.name) === atRule) {
          const name = atRuleIdent(preludeListOf(context.tokenLists, entry));
          if (name !== undefined && !reserved.has(name.toLowerCase())) {
            addToCache(name, encoder, cache);
            atRules.push({ name, rule: index });
          }
        }
        return;
      }
      if (entry.kind !== DECLARATION) return;
      const property = resolveProperty(entry.prop);
      const functionProperty = functionProperties?.has(property) ?? false;
      const parent = /** @type {ArenaIndex} */ (records.links.parentOf(index));
      const parentEntry = records.entry(parent);
      if (
        properties.has(property) ||
        functionProperty ||
        ((parentEntry.kind === AT_RULE_BLOCK ||
          parentEntry.kind === AT_RULE_STATEMENT) &&
          resolveAtRule(parentEntry.name) === atRule &&
          descriptors?.has(entry.prop.toLowerCase()))
      ) {
        references.push({ index, property, functionProperty });
      }
    },
    /**
     * @param {BlockRecords} records
     * @param {RunContext} context
     */
    transform(records, context) {
      const { tokenLists } = context;
      const defined = new Set(atRules.map((entry) => entry.name));
      const opaque = new Set();
      /** @type {Map<ArenaIndex, readonly CSSToken[]>} */
      const parsedValues = new Map();
      /** @type {Map<ArenaIndex, string>} */
      const values = new Map();
      for (const { index } of references) {
        const record =
          /** @type {import('../../../passes/ir/declarationRecord.js').DeclarationRecord} */ (
            records.entry(index)
          );
        const value = declaredValue(tokenLists, record);
        const parsedTokens = declaredValueTokens(tokenLists, record, value);
        values.set(index, value);
        parsedValues.set(index, parsedTokens);
        collectOpaqueIdents(value, opaque, parsedTokens);
      }
      const referenced = new Set();
      for (const { index, functionProperty } of references) {
        const parsedTokens = /** @type {readonly CSSToken[]} */ (
          parsedValues.get(index)
        );
        const value = /** @type {string} */ (values.get(index));
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
        const buffer = new ValueBuffer(value, undefined, parsedTokens);
        buffer.replaceRanges(edits);
        // Keep the raw of a value that renaming left as it was.
        if (buffer.text() !== value) {
          writeValue(records, context, index, buffer.tokens());
        }
      }
      for (const { name, rule } of atRules) {
        const encoded = cache.get(name);
        const entry = atRuleAt(records, rule);
        if (
          referenced.has(name) &&
          encoded !== preludeTextOf(tokenLists, entry)
        ) {
          writePrelude(context, entry, [encodedIdent(encoded)]);
        }
      }
      atRules = [];
      references = [];
    },
  };
}
