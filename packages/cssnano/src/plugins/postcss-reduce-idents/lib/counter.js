import addToCache from './cache.js';
import {
  collectOpaqueIdents,
  encodedIdent,
  rewrite,
  tokenEdits,
  TokenType,
} from './value.js';
import { counter, cssWideKeywords, resolveProperty } from './slots.js';
import { declaredValueTokens } from '../../../values/declaredValueTokens.js';
import { whitespace } from '../../../values/punctuationTokens.js';
import { ValueBuffer } from '../../../values/valueBuffer.js';

/** @import {TextTable} from '../../../values/textTable.js' */
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
  /** @type {import('postcss').Declaration[]} */
  let definitionSites = [];
  /** @type {import('postcss').Declaration[]} */
  let useSites = [];

  return {
    /** @param {import('postcss').AnyNode} node */ collect(node) {
      if (node.type !== 'decl') return;
      const property = resolveProperty(node.prop);
      if (counter.properties.has(property)) {
        definitionSites.push(node);
      } else if (counter.functionProperties.has(property)) {
        useSites.push(node);
      }
    },
    /** @param {TextTable} table */
    transform(table) {
      if (definitionSites.length === 0 || useSites.length === 0) {
        definitionSites = [];
        useSites = [];
        return;
      }

      // Symbol binding pass: only names defined in the document being
      // transformed rename, since counter names are case-sensitive custom
      // identifiers and the symbol table is reused across documents.
      const tokenCache = new Map();
      const defined = new Set();
      /** @type {Map<import('postcss').Declaration, readonly CSSToken[]>} */
      const defTokens = new Map();
      for (const decl of definitionSites) {
        const parsedTokens = declaredValueTokens(table, decl, tokenCache);
        defTokens.set(decl, parsedTokens);
        rewrite(
          decl.value,
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
      for (const decl of definitionSites) {
        collectOpaqueIdents(decl.value, opaque, defTokens.get(decl));
      }
      /** @type {Map<import('postcss').Declaration, readonly CSSToken[]>} */
      const useTokens = new Map();
      for (const decl of useSites) {
        const parsedTokens = declaredValueTokens(table, decl, tokenCache);
        useTokens.set(decl, parsedTokens);
        collectOpaqueIdents(decl.value, opaque, parsedTokens);
      }

      // Rewrite references and collect live symbols. A name is spelled as the
      // encoder wrote it, so its token keeps that text.
      const liveSymbols = new Set();
      for (const decl of useSites) {
        const parsedTokens = /** @type {readonly CSSToken[]} */ (
          useTokens.get(decl)
        );
        const buffer = new ValueBuffer(decl.value, undefined, parsedTokens);
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
        if (buffer.text() === decl.value) continue;
        buffer.replaceRanges(
          tokenEdits(buffer.tokens(), (token) =>
            token[0] === TokenType.Whitespace ? whitespace() : undefined
          )
        );
        table.write(decl, buffer.tokens());
      }

      if (liveSymbols.size > 0) {
        for (const decl of definitionSites) {
          const parsedTokens = /** @type {readonly CSSToken[]} */ (
            defTokens.get(decl)
          );
          const buffer = new ValueBuffer(decl.value, undefined, parsedTokens);
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
          if (buffer.text() !== decl.value) table.write(decl, buffer.tokens());
        }
      }

      definitionSites = [];
      useSites = [];
    },
  };
}
