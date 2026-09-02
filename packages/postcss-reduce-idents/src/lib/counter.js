import addToCache from './cache.js';
import isNum from './isNum.js';
import { rewrite, TokenType, tokens } from './value.js';
import { counter, cssWideKeywords, resolveProperty } from './slots.js';

const RESERVED = new Set([
  ...cssWideKeywords,
  ...counter.reservedKeywords,
  'list-item',
  'page',
]);
export default function counterReducer() {
  const cache = new Map();
  /** @type {import('postcss').Declaration[]} */
  let declarations = [];
  /** @type {WeakMap<import('postcss').Declaration, import('@csstools/css-tokenizer').CSSToken[]>} */
  const parsedValues = new WeakMap();
  return {
    /** @param {import('postcss').AnyNode} node @param {(value:string,index:number)=>string} encoder */ collect(
      node,
      encoder
    ) {
      if (node.type !== 'decl') return;
      const property = resolveProperty(node.prop);
      if (
        !counter.properties.has(property) &&
        !counter.functionProperties.has(property)
      )
        return;
      const parsed = tokens(node.value);
      parsedValues.set(node, parsed);
      if (counter.properties.has(property))
        for (const token of parsed)
          if (
            token[0] === TokenType.Ident &&
            !RESERVED.has(token[4].value.toLowerCase()) &&
            !isNum({ value: token[1] })
          )
            addToCache(token[4].value, encoder, cache);
      declarations.push(node);
    },
    transform() {
      for (const decl of declarations) {
        const functionProperty = counter.functionProperties.has(
          resolveProperty(decl.prop)
        );
        if (!functionProperty) continue;
        decl.value = rewrite(
          decl.value,
          (token, isFunctionArgument) => {
            if (token[0] === TokenType.Whitespace) return ' ';
            if (token[0] !== TokenType.Ident) return;
            if (!isFunctionArgument) return;
            const cached = cache.get(token[4].value);
            if (!cached) return;
            cached.count++;
            return cached.ident;
          },
          counter.functions,
          parsedValues.get(decl)
        );
      }
      for (const decl of declarations)
        if (counter.properties.has(resolveProperty(decl.prop))) {
          const parsed = parsedValues.get(decl);
          decl.value = rewrite(
            decl.value,
            (token) => {
              if (token[0] !== TokenType.Ident) return;
              const cached = cache.get(token[4].value);
              return cached?.count ? cached.ident : undefined;
            },
            undefined,
            parsed
          );
        }
      declarations = [];
    },
  };
}
