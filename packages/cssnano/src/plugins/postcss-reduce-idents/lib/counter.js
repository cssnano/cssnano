import addToCache from './cache.js';
import {
  collectOpaqueIdents,
  encodedIdent,
  rewrite,
  tokenEdits,
  TokenType,
} from './value.js';
import { counter, cssWideKeywords, resolveProperty } from './slots.js';
import {
  declaredValue,
  declaredValueTokens,
} from '../../../passes/ir/declaredText.js';
import { DECLARATION } from '../../../passes/ir/blockRecord.js';
import { writeValue } from '../../../passes/ir/valueEdits.js';
import { whitespace } from '../../../values/punctuationTokens.js';
import { ValueBuffer } from '../../../values/valueBuffer.js';

/** @import {ArenaIndex} from '../../../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../../passes/ir/blockRecords.js' */
/** @import {RunContext} from '../../../passes/ir/runContext.js' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */

/*
 * page counter (CSS Paged Media 3) and the
 * list-item counter (CSS Lists 3)
 */
const RESERVED = new Set([
  ...cssWideKeywords,
  ...counter.reservedKeywords,
  'list-item',
  'page',
]);

// reversed()` wraps the counter name it resets
const REVERSED_FUNCTIONS = new Map([['reversed', [0]]]);

/**
 * @param {(value: string, index: number) => string} encoder
 */
export default function counterReducer(encoder) {
  /** @type {Map<string, string>} */
  const symbolTable = new Map();
  /** @type {ArenaIndex[]} */
  let definitionSites = [];
  /** @type {ArenaIndex[]} */
  let useSites = [];

  return {
    /**
     * @param {ArenaIndex} index
     * @param {BlockRecords} records
     */
    collect(index, records) {
      const entry = records.entry(index);
      if (entry.kind !== DECLARATION) return;
      const property = resolveProperty(entry.prop);
      if (counter.properties.has(property)) {
        definitionSites.push(index);
      } else if (counter.functionProperties.has(property)) {
        useSites.push(index);
      }
    },
    /**
     * @param {BlockRecords} records
     * @param {RunContext} context
     */
    transform(records, context) {
      const { tokenLists } = context;
      /** @param {ArenaIndex} index */
      const valueOf = (index) =>
        declaredValue(
          tokenLists,
          /** @type {import('../../../passes/ir/declarationRecord.js').DeclarationRecord} */ (
            records.entry(index)
          )
        );
      /**
       * @param {ArenaIndex} index
       * @param {string} value
       */
      const tokensOf = (index, value) =>
        declaredValueTokens(
          tokenLists,
          /** @type {import('../../../passes/ir/declarationRecord.js').DeclarationRecord} */ (
            records.entry(index)
          ),
          value
        );
      if (definitionSites.length === 0 || useSites.length === 0) {
        definitionSites = [];
        useSites = [];
        return;
      }

      // Symbol binding pass: only names defined in the document being
      // transformed rename, since counter names are case-sensitive custom
      // identifiers and the symbol table is reused across documents.
      const defined = new Set();
      /** @type {Map<ArenaIndex, string>} */
      const defValues = new Map();
      /** @type {Map<ArenaIndex, readonly CSSToken[]>} */
      const defTokens = new Map();
      for (const index of definitionSites) {
        const value = valueOf(index);
        const parsedTokens = tokensOf(index, value);
        defValues.set(index, value);
        defTokens.set(index, parsedTokens);
        rewrite(
          value,
          (token, position) => {
            if (token[0] !== TokenType.Ident) return;
            if (position === 'nested') return;
            const name = token[4].value;
            if (RESERVED.has(name.toLowerCase())) return;
            defined.add(name);
            addToCache(name, encoder, symbolTable);
          },
          REVERSED_FUNCTIONS,
          parsedTokens
        );
      }

      // Leave names such as var() fallbacks unrenamed
      const opaque = new Set();
      for (const index of definitionSites) {
        collectOpaqueIdents(
          /** @type {string} */ (defValues.get(index)),
          opaque,
          defTokens.get(index)
        );
      }
      /** @type {Map<ArenaIndex, string>} */
      const useValues = new Map();
      /** @type {Map<ArenaIndex, readonly CSSToken[]>} */
      const useTokens = new Map();
      for (const index of useSites) {
        const value = valueOf(index);
        const parsedTokens = tokensOf(index, value);
        useValues.set(index, value);
        useTokens.set(index, parsedTokens);
        collectOpaqueIdents(value, opaque, parsedTokens);
      }

      // Rewrite references and collect live symbols. A name is spelled as the
      // encoder wrote it, so its token keeps that text.
      const liveSymbols = new Set();
      for (const index of useSites) {
        const value = /** @type {string} */ (useValues.get(index));
        const parsedTokens = /** @type {readonly CSSToken[]} */ (
          useTokens.get(index)
        );
        const buffer = new ValueBuffer(value, undefined, parsedTokens);
        buffer.replaceRanges(
          tokenEdits(
            parsedTokens,
            (token, position) => {
              if (token[0] !== TokenType.Ident) return;
              if (position !== 'argument') return;
              const name = token[4].value;
              if (!defined.has(name) || opaque.has(name)) return;
              liveSymbols.add(name);
              const encoded = /** @type {string} */ (symbolTable.get(name));
              return encodedIdent(encoded);
            },
            counter.functions
          )
        );
        // Normalize whitespace between counter-function arguments only when
        // the value is rewritten; leave untouched declarations as they are.
        if (buffer.text() === value) continue;
        buffer.replaceRanges(
          tokenEdits(buffer.tokens(), (token) =>
            token[0] === TokenType.Whitespace ? whitespace() : undefined
          )
        );
        writeValue(records, context, index, buffer.tokens());
      }

      if (liveSymbols.size > 0) {
        for (const index of definitionSites) {
          const value = /** @type {string} */ (defValues.get(index));
          const parsedTokens = /** @type {readonly CSSToken[]} */ (
            defTokens.get(index)
          );
          const buffer = new ValueBuffer(value, undefined, parsedTokens);
          buffer.replaceRanges(
            tokenEdits(
              parsedTokens,
              (token, position) => {
                if (token[0] !== TokenType.Ident) return;
                if (position === 'nested') return;
                const name = token[4].value;
                if (!liveSymbols.has(name)) return;
                const encoded = /** @type {string} */ (symbolTable.get(name));
                return encodedIdent(encoded);
              },
              REVERSED_FUNCTIONS
            )
          );
          if (buffer.text() !== value) {
            writeValue(records, context, index, buffer.tokens());
          }
        }
      }

      definitionSites = [];
      useSites = [];
    },
  };
}
