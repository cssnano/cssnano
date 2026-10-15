import addToCache from './cache.js';
import { collectOpaqueIdents, rewrite, tokens, TokenType } from './value.js';
import { counter, cssWideKeywords, resolveProperty } from './slots.js';

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
    transform() {
      if (definitionSites.length === 0 || useSites.length === 0) {
        definitionSites = [];
        useSites = [];
        return;
      }

      // Symbol binding pass: only names defined in the document being
      // transformed rename, since counter names are case-sensitive custom
      // identifiers and the symbol table is reused across documents.
      const defined = new Set();
      /** @type {Map<import('postcss').Declaration, import('@csstools/css-tokenizer').CSSToken[]>} */
      const defTokens = new Map();
      for (const decl of definitionSites) {
        const parsedTokens = tokens(decl.value);
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
      /** @type {Map<import('postcss').Declaration, import('@csstools/css-tokenizer').CSSToken[]>} */
      const useTokens = new Map();
      for (const decl of useSites) {
        const parsedTokens = tokens(decl.value);
        useTokens.set(decl, parsedTokens);
        collectOpaqueIdents(decl.value, opaque, parsedTokens);
      }

      // Rewrite references and collect live symbols.
      const liveSymbols = new Set();
      for (const decl of useSites) {
        const rewritten = rewrite(
          decl.value,
          (token, position) => {
            if (token[0] !== TokenType.Ident) return;
            if (position !== 'argument') return;
            const name = token[4].value;
            if (!defined.has(name) || opaque.has(name)) return;
            liveSymbols.add(name);
            return symbolTable.get(name);
          },
          counter.functions,
          useTokens.get(decl)
        );
        // Normalize whitespace between counter-function arguments only when
        // the value is rewritten; leave untouched declarations as they are.
        decl.value =
          rewritten === decl.value
            ? rewritten
            : rewrite(rewritten, (token) =>
                token[0] === TokenType.Whitespace ? ' ' : undefined
              );
      }

      if (liveSymbols.size > 0) {
        for (const decl of definitionSites) {
          decl.value = rewrite(
            decl.value,
            (token, position) => {
              if (token[0] !== TokenType.Ident) return;
              if (position === 'nested') return;
              return liveSymbols.has(token[4].value)
                ? symbolTable.get(token[4].value)
                : undefined;
            },
            REVERSED_FUNCTIONS,
            defTokens.get(decl)
          );
        }
      }

      definitionSites = [];
      useSites = [];
    },
  };
}
