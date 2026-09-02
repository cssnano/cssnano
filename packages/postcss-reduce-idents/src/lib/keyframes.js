import addToCache from './cache.js';
import { rewrite, TokenType } from './value.js';
import {
  cssWideKeywords,
  keyframes,
  resolveAtRule,
  resolveProperty,
} from './slots.js';

const RESERVED = new Set([...cssWideKeywords, ...keyframes.reservedKeywords]);
export default function keyframesReducer() {
  const cache = new Map();
  /** @type {import('postcss').AtRule[]} */ let atRules = [];
  /** @type {import('postcss').Declaration[]} */ let decls = [];
  return {
    /** @param {import('postcss').AnyNode} node @param {(value:string,index:number)=>string} encoder */ collect(
      node,
      encoder
    ) {
      if (
        node.type === 'atrule' &&
        resolveAtRule(node.name) === keyframes.atRule &&
        !RESERVED.has(node.params.toLowerCase())
      ) {
        addToCache(node.params, encoder, cache);
        atRules.push(node);
      }
      if (
        node.type === 'decl' &&
        keyframes.properties.has(resolveProperty(node.prop))
      )
        decls.push(node);
    },
    transform() {
      const referenced = new Set();
      for (const decl of decls)
        decl.value = rewrite(decl.value, (token) => {
          if (token[0] !== TokenType.Ident) return;
          const cached = cache.get(token[4].value);
          if (!cached) return;
          referenced.add(token[4].value);
          cached.count++;
          return cached.ident;
        });
      for (const rule of atRules) {
        const cached = cache.get(rule.params);
        if (cached?.count && referenced.has(rule.params))
          rule.params = cached.ident;
      }
      atRules = [];
      decls = [];
    },
  };
}
