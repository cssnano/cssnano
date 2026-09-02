import addToCache from './cache.js';
import { rewrite, TokenType } from './value.js';
import {
  counterStyle,
  cssWideKeywords,
  resolveAtRule,
  resolveProperty,
} from './slots.js';

const RESERVED = new Set([
  ...cssWideKeywords,
  ...counterStyle.reservedKeywords,
  'inline',
  'outside',
  'disc',
  'circle',
  'square',
  'decimal',
]);
export default function counterStyleReducer() {
  const cache = new Map();
  /** @type {import('postcss').AtRule[]} */
  let atRules = [];
  /** @type {import('postcss').Declaration[]} */
  let declarations = [];
  return {
    /** @param {import('postcss').AnyNode} node @param {(value:string,index:number)=>string} encoder */ collect(
      node,
      encoder
    ) {
      if (
        node.type === 'atrule' &&
        resolveAtRule(node.name) === counterStyle.atRule &&
        !RESERVED.has(node.params.toLowerCase())
      ) {
        addToCache(node.params, encoder, cache);
        atRules.push(node);
      }
      if (
        node.type === 'decl' &&
        (counterStyle.properties.has(resolveProperty(node.prop)) ||
          (node.parent?.type === 'atrule' &&
            resolveAtRule(node.parent.name) === counterStyle.atRule &&
            counterStyle.descriptors.has(node.prop.toLowerCase())) ||
          counterStyle.functionProperties.has(resolveProperty(node.prop)))
      )
        declarations.push(node);
    },
    transform() {
      for (const decl of declarations) {
        const functionProperty = counterStyle.functionProperties.has(
          resolveProperty(decl.prop)
        );
        decl.value = rewrite(
          decl.value,
          (token, isFunctionArgument) => {
            if (token[0] !== TokenType.Ident) return;
            if (functionProperty && !isFunctionArgument) return;
            const cached = cache.get(token[4].value);
            if (!cached) return;
            cached.count++;
            return cached.ident;
          },
          functionProperty ? counterStyle.functions : undefined
        );
      }
      for (const rule of atRules) {
        const cached = cache.get(rule.params);
        if (cached?.count) rule.params = cached.ident;
      }
      atRules = [];
      declarations = [];
    },
  };
}
