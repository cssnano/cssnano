import addToCache from './cache.js';
import { rewrite, TokenType, tokens } from './value.js';
import isNum from './isNum.js';
import { cssWideKeywords, grid, resolveProperty } from './slots.js';

const RESERVED = new Set([...cssWideKeywords, ...grid.reservedKeywords]);
export default function gridTemplateReducer() {
  const cache = new Map();
  /** @type {import('postcss').Declaration[]} */
  let templates = [];
  /** @type {import('postcss').Declaration[]} */
  let children = [];
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
        for (const token of tokens(node.value)) {
          if (token[0] === TokenType.String)
            for (const word of token[4].value.split(/\s+/))
              if (
                word &&
                !/^\.+$/.test(word) &&
                !RESERVED.has(word.toLowerCase())
              )
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
        for (const token of tokens(node.value))
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
        decl.value = rewrite(decl.value, (token) => {
          const cached =
            token[0] === TokenType.Ident && cache.get(token[4].value);
          if (!cached) return;
          cached.count++;
          return cached.ident;
        });
      for (const decl of templates) {
        const used = tokens(decl.value).some((token) => {
          if (token[0] === TokenType.String)
            return token[4].value
              .split(/\s+/)
              .some((word) => cache.get(word)?.count);
          return (
            token[0] === TokenType.Ident &&
            Boolean(cache.get(token[4].value)?.count)
          );
        });
        decl.value = rewrite(decl.value, (token) => {
          if (token[0] === TokenType.Whitespace) return ' ';
          if (token[0] === TokenType.String) {
            const value = token[4].value
              .replace(/\.{2,}/g, '.')
              .trim()
              .split(/\s+/)
              .map((word) =>
                used && cache.get(word) ? cache.get(word).ident : word
              )
              .join(' ');
            return token[1][0] + value + token[1].at(-1);
          }
          const cached =
            token[0] === TokenType.Ident && cache.get(token[4].value);
          if (!cached) return;
          return used ? cached.ident : undefined;
        });
      }
      templates = [];
      children = [];
    },
  };
}
