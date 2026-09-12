import registerSymbol from './cache.js';
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
  /** @type {Map<string, { ident: string, count: number }>} */
  const symbolTable = new Map();
  /** @type {import('postcss').Declaration[]} */
  let defSites = [];
  /** @type {import('postcss').Declaration[]} */
  let useSites = [];
  /** @type {(value: string, index: number) => string} */
  let encoderFn;

  return {
    /** @param {import('postcss').AnyNode} node @param {(value:string,index:number)=>string} encoder */ collect(
      node,
      encoder
    ) {
      if (node.type !== 'decl') return;
      encoderFn = encoder;
      const property = resolveProperty(node.prop);
      if (counter.properties.has(property)) {
        defSites.push(node);
      } else if (counter.functionProperties.has(property)) {
        useSites.push(node);
      }
    },
    transform() {
      // Def-use analysis: renaming requires both definition and use sites
      if (defSites.length === 0 || useSites.length === 0) {
        defSites = [];
        useSites = [];
        return;
      }

      // Symbol binding pass: collect symbols declared at definition sites
      for (const decl of defSites) {
        for (const token of tokens(decl.value)) {
          if (
            token[0] === TokenType.Ident &&
            !RESERVED.has(token[4].value.toLowerCase()) &&
            !isNum({ value: token[1] })
          ) {
            registerSymbol(token[4].value, encoderFn, symbolTable);
          }
        }
      }

      // Use-site rewrite pass: rewrite references and collect live symbols
      const liveSymbols = new Set();
      for (const decl of useSites) {
        decl.value = rewrite(
          decl.value,
          (token, isFunctionArgument) => {
            if (token[0] === TokenType.Whitespace) return ' ';
            if (token[0] !== TokenType.Ident) return;
            if (!isFunctionArgument) return;
            const symbol = symbolTable.get(token[4].value);
            if (!symbol) return;
            liveSymbols.add(token[4].value);
            return symbol.ident;
          },
          counter.functions
        );
      }

      // Def-site rewrite pass: only rewrite definitions for live symbols
      if (liveSymbols.size > 0) {
        for (const decl of defSites) {
          decl.value = rewrite(decl.value, (token) => {
            if (token[0] !== TokenType.Ident) return;
            const symbol = symbolTable.get(token[4].value);
            return liveSymbols.has(token[4].value) ? symbol?.ident : undefined;
          });
        }
      }

      defSites = [];
      useSites = [];
    },
  };
}
