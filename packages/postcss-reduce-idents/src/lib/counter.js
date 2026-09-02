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
      if (counter.properties.has(property))
        for (const token of tokens(node.value))
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
        decl.value = rewrite(
          decl.value,
          (token, isFunctionArgument) => {
            if (token[0] === TokenType.Whitespace && functionProperty)
              return ' ';
            if (token[0] !== TokenType.Ident) return;
            if (functionProperty && !isFunctionArgument) return;
            const cached = cache.get(token[4].value);
            if (!cached) return;
            if (functionProperty) cached.count++;
            return cached.ident;
          },
          functionProperty ? counter.functions : undefined
        );
      }
      for (const decl of declarations)
        if (counter.properties.has(resolveProperty(decl.prop)))
          decl.value = rewrite(decl.value, (token) => {
            if (token[0] !== TokenType.Ident) return;
            for (const [name, cached] of cache)
              if (token[4].value === cached.ident && !cached.count) return name;
          });
      declarations = [];
    },
  };
}
