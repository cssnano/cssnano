import addToCache from './cache.js';
import { TokenType, collectOpaqueIdents, rewrite, tokens } from './value.js';
import { cssWideKeywords, grid, resolveProperty } from './slots.js';

/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */

const RESERVED = new Set([...cssWideKeywords, ...grid.reservedKeywords]);

// Treat an <area>-start/<area>-end line reference as a reference to its
// area (CSS Grid 2 §8.3).
const IMPLICIT_LINE_SUFFIXES = ['-start', '-end'];

/**
 * Split a decoded CSS string on whitespace.
 * @param {string} value
 * @return {string[]}
 */
function stringWords(value) {
  return value.split(/[ \t\n\f\r]+/v).filter(Boolean);
}

/**
 * Record the named areas and bracketed line names a grid template
 * declaration defines: areas from the strings, line names from between
 * brackets. Filter out names substituted through var()/env()/attr().
 * @param {import('postcss').Declaration} decl
 * @param {CSSToken[]} parsedTokens
 * @param {(value: string, index: number) => string} encoder
 * @param {Map<string, string>} symbolTable
 * @param {Set<string>} areas
 * @param {Set<string>} lineNames
 */
function bindTemplateSymbols(
  decl,
  parsedTokens,
  encoder,
  symbolTable,
  areas,
  lineNames
) {
  rewrite(
    decl.value,
    (token, position) => {
      if (position === 'nested') return;
      if (token[0] === TokenType.String) {
        for (const word of stringWords(token[4].value)) {
          if (!/^\.+$/v.test(word) && !RESERVED.has(word.toLowerCase())) {
            areas.add(word);
            addToCache(word, encoder, symbolTable);
          }
        }
      } else if (
        token[0] === TokenType.Ident &&
        position === 'bracketed' &&
        !RESERVED.has(token[4].value.toLowerCase())
      ) {
        lineNames.add(token[4].value);
        addToCache(token[4].value, encoder, symbolTable);
      }
      return undefined;
    },
    undefined,
    parsedTokens
  );
}

/**
 * @param {(value: string, index: number) => string} encoder
 */
export default function gridTemplateReducer(encoder) {
  /** @type {Map<string, string>} */
  const symbolTable = new Map();
  /** @type {import('postcss').Declaration[]} */
  let defSites = [];
  /** @type {import('postcss').Declaration[]} */
  let useSites = [];

  return {
    /** @param {import('postcss').AnyNode} node */ collect(node) {
      if (node.type !== 'decl') return;
      const property = resolveProperty(node.prop);
      if (grid.templateProperties.has(property)) {
        defSites.push(node);
      } else if (grid.referenceProperties.has(property)) {
        useSites.push(node);
      }
    },
    transform() {
      if (defSites.length === 0 && useSites.length === 0) {
        defSites = [];
        useSites = [];
        return;
      }

      // Bind only names whose template definition and reference occur in
      // the same document; grid names are case-sensitive. Tokenize each
      // definition once and reuse its tokens below.
      const areas = new Set();
      const lineNames = new Set();
      /** @type {Map<import('postcss').Declaration, CSSToken[]>} */
      const parsedTemplates = new Map();
      for (const decl of defSites) {
        const parsedTokens = tokens(decl.value);
        parsedTemplates.set(decl, parsedTokens);
        bindTemplateSymbols(
          decl,
          parsedTokens,
          encoder,
          symbolTable,
          areas,
          lineNames
        );
      }

      // Tokenize each use site once, then collect live symbols and rewrite
      // references. Collect names spelled outside the grammar, such as
      // var() fallbacks; leave them unrenamed.
      const opaque = new Set();
      for (const decl of defSites) {
        collectOpaqueIdents(decl.value, opaque, parsedTemplates.get(decl));
      }
      /** @type {Map<import('postcss').Declaration, CSSToken[]>} */
      const parsedReferences = new Map();
      const liveSymbols = new Set();
      for (const decl of useSites) {
        const parsedTokens = tokens(decl.value);
        parsedReferences.set(decl, parsedTokens);
        collectOpaqueIdents(decl.value, opaque, parsedTokens);
      }
      for (const decl of useSites) {
        decl.value = rewrite(
          decl.value,
          (token, position) => {
            if (token[0] !== TokenType.Ident) return;
            if (position !== 'bare') return;
            const name = token[4].value;
            if (opaque.has(name)) return;
            if (areas.has(name) || lineNames.has(name)) {
              liveSymbols.add(name);
              return symbolTable.get(name);
            }
            // Rename an implicit <area>-start/<area>-end line with its area;
            // a bracketed line name spelled the same way takes precedence.
            const suffix = IMPLICIT_LINE_SUFFIXES.find((implicit) =>
              name.endsWith(implicit)
            );
            if (suffix === undefined) return undefined;
            const area = name.slice(0, -suffix.length);
            if (areas.has(area) && !opaque.has(area)) {
              liveSymbols.add(area);
              return symbolTable.get(area) + suffix;
            }
            return undefined;
          },
          undefined,
          parsedReferences.get(decl)
        );
      }

      // Rename only live names; normalize dots and whitespace.
      for (const decl of defSites) {
        decl.value = rewrite(
          decl.value,
          (token, position) => {
            if (token[0] === TokenType.Whitespace) return ' ';
            if (token[0] === TokenType.String) {
              const value = stringWords(token[4].value)
                .map((word) => {
                  const normalized = /^\.+$/v.test(word) ? '.' : word;
                  const symbol = liveSymbols.has(word)
                    ? symbolTable.get(word)
                    : undefined;
                  return symbol ?? normalized;
                })
                .join(' ');
              return serializeString(value, token[1][0]);
            }
            return token[0] === TokenType.Ident &&
              position === 'bracketed' &&
              liveSymbols.has(token[4].value)
              ? symbolTable.get(token[4].value)
              : undefined;
          },
          undefined,
          parsedTemplates.get(decl)
        );
      }

      defSites = [];
      useSites = [];
    },
  };
}

/**
 * Serialize decoded CSS string content with its quote style.
 * @param {string} value
 * @param {string} quote
 * @return {string}
 */
function serializeString(value, quote) {
  const pieces = [quote];
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (character === quote || character === '\\') {
      pieces.push(`\\${character}`);
    } else if (codePoint < 0x20 || codePoint === 0x7f) {
      pieces.push(`\\${codePoint.toString(16)} `);
    } else {
      pieces.push(character);
    }
  }
  pieces.push(quote);
  return pieces.join('');
}
