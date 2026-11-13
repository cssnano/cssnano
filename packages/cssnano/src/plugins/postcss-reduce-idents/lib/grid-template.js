import addToCache from './cache.js';
import {
  TokenType,
  collectOpaqueIdents,
  encodedIdent,
  rewrite,
  tokenEdits,
} from './value.js';
import { cssWideKeywords, grid, resolveProperty } from './slots.js';
import {
  declaredValue,
  declaredValueTokens,
} from '../../../passes/ir/declaredText.js';
import { DECLARATION } from '../../../passes/ir/blockRecord.js';
import { writeValue } from '../../../passes/ir/valueEdits.js';
import { whitespace } from '../../../values/punctuationTokens.js';
import { stringToken } from '../../../values/tokenConstructors.js';
import { ValueBuffer } from '../../../values/valueBuffer.js';

/** @import {ArenaIndex} from '../../../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../../passes/ir/blockRecords.js' */
/** @import {DeclarationRecord} from '../../../passes/ir/declarationRecord.js' */
/** @import {RunContext} from '../../../passes/ir/runContext.js' */
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
 * The identifier token of a name the symbol table has encoded.
 * @param {Map<string, string>} symbolTable
 * @param {string} name
 * @return {CSSToken}
 */
function encodedName(symbolTable, name) {
  return encodedIdent(/** @type {string} */ (symbolTable.get(name)));
}

/**
 * Record the named areas and bracketed line names a grid template
 * declaration defines: areas from the strings, line names from between
 * brackets. Filter out names substituted through var()/env()/attr().
 * @param {string} value the declaration value
 * @param {readonly CSSToken[]} parsedTokens
 * @param {(value: string, index: number) => string} encoder
 * @param {Map<string, string>} symbolTable
 * @param {Set<string>} areas
 * @param {Set<string>} lineNames
 */
function bindTemplateSymbols(
  value,
  parsedTokens,
  encoder,
  symbolTable,
  areas,
  lineNames
) {
  rewrite(
    value,
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
  /** @type {ArenaIndex[]} */
  let defSites = [];
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
      if (grid.templateProperties.has(property)) {
        defSites.push(index);
      } else if (grid.referenceProperties.has(property)) {
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
      const recordOf = (index) =>
        /** @type {DeclarationRecord} */ (records.entry(index));
      if (defSites.length === 0 && useSites.length === 0) {
        defSites = [];
        useSites = [];
        return;
      }

      // Bind only names whose template definition and reference occur in
      // the same document; grid names are case-sensitive. Read each
      // definition's tokens once and reuse them below.
      const areas = new Set();
      const lineNames = new Set();
      /** @type {Map<ArenaIndex, string>} */
      const defValues = new Map();
      /** @type {Map<ArenaIndex, readonly CSSToken[]>} */
      const parsedTemplates = new Map();
      for (const index of defSites) {
        const value = declaredValue(tokenLists, recordOf(index));
        const parsedTokens = declaredValueTokens(
          tokenLists,
          recordOf(index),
          value
        );
        defValues.set(index, value);
        parsedTemplates.set(index, parsedTokens);
        bindTemplateSymbols(
          value,
          parsedTokens,
          encoder,
          symbolTable,
          areas,
          lineNames
        );
      }

      // Read each use site's tokens once, then collect live symbols and
      // rewrite references. Collect names spelled outside the grammar, such
      // as var() fallbacks; leave them unrenamed.
      const opaque = new Set();
      for (const index of defSites) {
        collectOpaqueIdents(
          /** @type {string} */ (defValues.get(index)),
          opaque,
          parsedTemplates.get(index)
        );
      }
      /** @type {Map<ArenaIndex, string>} */
      const useValues = new Map();
      /** @type {Map<ArenaIndex, readonly CSSToken[]>} */
      const parsedReferences = new Map();
      const liveSymbols = new Set();
      for (const index of useSites) {
        const value = declaredValue(tokenLists, recordOf(index));
        const parsedTokens = declaredValueTokens(
          tokenLists,
          recordOf(index),
          value
        );
        useValues.set(index, value);
        parsedReferences.set(index, parsedTokens);
        collectOpaqueIdents(value, opaque, parsedTokens);
      }
      for (const index of useSites) {
        const value = /** @type {string} */ (useValues.get(index));
        const parsedTokens = /** @type {readonly CSSToken[]} */ (
          parsedReferences.get(index)
        );
        const buffer = new ValueBuffer(value, undefined, parsedTokens);
        buffer.replaceRanges(
          tokenEdits(parsedTokens, (token, position) => {
            if (token[0] !== TokenType.Ident) return;
            if (position !== 'bare') return;
            const name = token[4].value;
            if (opaque.has(name)) return;
            if (areas.has(name) || lineNames.has(name)) {
              liveSymbols.add(name);
              return encodedName(symbolTable, name);
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
              return encodedIdent(
                /** @type {string} */ (symbolTable.get(area)) + suffix
              );
            }
            return undefined;
          })
        );
        if (buffer.text() !== value) {
          writeValue(records, context, index, buffer.tokens());
        }
      }

      // Rename only live names; normalize dots and whitespace.
      for (const index of defSites) {
        const value = /** @type {string} */ (defValues.get(index));
        const parsedTokens = /** @type {readonly CSSToken[]} */ (
          parsedTemplates.get(index)
        );
        const buffer = new ValueBuffer(value, undefined, parsedTokens);
        buffer.replaceRanges(
          tokenEdits(parsedTokens, (token, position) => {
            if (token[0] === TokenType.Whitespace) return whitespace();
            if (token[0] === TokenType.String) {
              const text = stringWords(token[4].value)
                .map((word) => {
                  const normalized = /^\.+$/v.test(word) ? '.' : word;
                  const symbol = liveSymbols.has(word)
                    ? symbolTable.get(word)
                    : undefined;
                  return symbol ?? normalized;
                })
                .join(' ');
              return stringToken(serializeString(text, token[1][0]), text);
            }
            return token[0] === TokenType.Ident &&
              position === 'bracketed' &&
              liveSymbols.has(token[4].value)
              ? encodedName(symbolTable, token[4].value)
              : undefined;
          })
        );
        if (buffer.text() !== value) {
          writeValue(records, context, index, buffer.tokens());
        }
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
