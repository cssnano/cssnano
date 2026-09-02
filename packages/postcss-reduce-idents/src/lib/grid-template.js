import addToCache from './cache.js';
import { rewrite, TokenType, tokens } from './value.js';
import isNum from './isNum.js';
import { cssWideKeywords, grid, resolveProperty } from './slots.js';

const RESERVED = new Set([...cssWideKeywords, ...grid.reservedKeywords]);

/**
 * Split a decoded CSS string on whitespace.
 * @param {string} value
 * @return {string[]}
 */
function stringWords(value) {
  return value.split(/[ \t\n\f\r]+/).filter(Boolean);
}

export default function gridTemplateReducer() {
  const cache = new Map();
  /** @type {import('postcss').Declaration[]} */
  let templates = [];
  /** @type {import('postcss').Declaration[]} */
  let children = [];
  /** @type {WeakMap<import('postcss').Declaration, import('@csstools/css-tokenizer').CSSToken[]>} */
  const parsedValues = new WeakMap();
  return {
    /** @param {import('postcss').AnyNode} node @param {(value:string,index:number)=>string} encoder */ collect(
      node,
      encoder
    ) {
      if (node.type !== 'decl') return;
      const property = resolveProperty(node.prop);
      if (grid.templateProperties.has(property)) {
        templates.push(node);
        let squareDepth = 0;
        const parsed = tokens(node.value);
        parsedValues.set(node, parsed);
        for (const token of parsed) {
          if (token[0] === TokenType.String)
            for (const word of stringWords(token[4].value))
              if (!/^\.+$/.test(word) && !RESERVED.has(word.toLowerCase()))
                addToCache(word, encoder, cache);
          if (token[0] === TokenType.OpenSquare) squareDepth++;
          if (token[0] === TokenType.CloseSquare) squareDepth--;
          if (
            token[0] === TokenType.Ident &&
            squareDepth &&
            !RESERVED.has(token[4].value.toLowerCase())
          )
            addToCache(token[4].value, encoder, cache);
        }
      } else if (grid.referenceProperties.has(property)) {
        children.push(node);
        const parsed = tokens(node.value);
        parsedValues.set(node, parsed);
        for (const token of parsed)
          if (
            token[0] === TokenType.Ident &&
            !isNum({ value: token[1] }) &&
            !RESERVED.has(token[4].value.toLowerCase())
          )
            addToCache(token[4].value, encoder, cache);
      }
    },
    transform() {
      for (const decl of children)
        decl.value = rewrite(
          decl.value,
          (token) => {
            const cached =
              token[0] === TokenType.Ident && cache.get(token[4].value);
            if (!cached) return;
            cached.count++;
            return cached.ident;
          },
          undefined,
          parsedValues.get(decl)
        );
      for (const decl of templates) {
        const parsed = parsedValues.get(decl);
        if (!parsed) continue;
        const used = parsed.some((token) => {
          if (token[0] === TokenType.String)
            return stringWords(token[4].value).some(
              (word) => cache.get(word)?.count
            );
          return (
            token[0] === TokenType.Ident &&
            Boolean(cache.get(token[4].value)?.count)
          );
        });
        decl.value = rewrite(
          decl.value,
          (token) => {
            if (token[0] === TokenType.Whitespace) return ' ';
            if (token[0] === TokenType.String) {
              const value = stringWords(token[4].value)
                .map((word) => {
                  const normalized = /^\.+$/.test(word) ? '.' : word;
                  const cached = cache.get(word);
                  return used && cached ? cached.ident : normalized;
                })
                .join(' ');
              return serializeString(value, token[1][0]);
            }
            const cached =
              token[0] === TokenType.Ident && cache.get(token[4].value);
            if (!cached) return;
            return used ? cached.ident : undefined;
          },
          undefined,
          parsed
        );
      }
      templates = [];
      children = [];
    },
  };
}

/**
 * Serialize decoded CSS string content while retaining its quote style.
 * @param {string} value
 * @param {string} quote
 * @return {string}
 */
function serializeString(value, quote) {
  let result = quote;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (character === quote || character === '\\') {
      result += `\\${character}`;
    } else if (codePoint < 0x20 || codePoint === 0x7f) {
      result += `\\${codePoint.toString(16)} `;
    } else {
      result += character;
    }
  }
  return result + quote;
}
