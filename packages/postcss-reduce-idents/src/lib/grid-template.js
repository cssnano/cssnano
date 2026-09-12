import registerSymbol from './cache.js';
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

/**
 * Bind named areas and bracketed line names defined in a grid template declaration.
 * @param {import('postcss').Declaration} decl
 * @param {(value: string, index: number) => string} encoderFn
 * @param {Map<string, { ident: string, count: number }>} symbolTable
 */
function bindTemplateSymbols(decl, encoderFn, symbolTable) {
  let squareDepth = 0;
  for (const token of tokens(decl.value)) {
    if (token[0] === TokenType.String) {
      for (const word of stringWords(token[4].value)) {
        if (!/^\.+$/.test(word) && !RESERVED.has(word.toLowerCase())) {
          registerSymbol(word, encoderFn, symbolTable);
        }
      }
    }
    if (token[0] === TokenType.OpenSquare) squareDepth++;
    if (token[0] === TokenType.CloseSquare) squareDepth--;
    if (
      token[0] === TokenType.Ident &&
      squareDepth > 0 &&
      !RESERVED.has(token[4].value.toLowerCase())
    ) {
      registerSymbol(token[4].value, encoderFn, symbolTable);
    }
  }
}

/**
 * Bind identifier references in grid placement declarations.
 * @param {import('postcss').Declaration} decl
 * @param {(value: string, index: number) => string} encoderFn
 * @param {Map<string, { ident: string, count: number }>} symbolTable
 */
function bindReferenceSymbols(decl, encoderFn, symbolTable) {
  for (const token of tokens(decl.value)) {
    if (
      token[0] === TokenType.Ident &&
      !isNum({ value: token[1] }) &&
      !RESERVED.has(token[4].value.toLowerCase())
    ) {
      registerSymbol(token[4].value, encoderFn, symbolTable);
    }
  }
}

export default function gridTemplateReducer() {
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

      // Symbol binding pass: collect symbols declared at template definition sites
      for (const decl of defSites) {
        bindTemplateSymbols(decl, encoderFn, symbolTable);
      }

      // Symbol binding pass: collect symbols referenced in placement properties
      for (const decl of useSites) {
        bindReferenceSymbols(decl, encoderFn, symbolTable);
      }

      // Use-site rewrite pass: rewrite references and collect live symbols
      const liveSymbols = new Set();
      for (const decl of useSites) {
        decl.value = rewrite(decl.value, (token) => {
          const symbol =
            token[0] === TokenType.Ident && symbolTable.get(token[4].value);
          if (!symbol) return;
          liveSymbols.add(token[4].value);
          return symbol.ident;
        });
      }

      // Def-site rewrite pass: rewrite template definitions if live, normalize dots
      for (const decl of defSites) {
        const parsedTokens = tokens(decl.value);
        let squareDepthUsed = 0;
        const isLive = parsedTokens.some((token) => {
          if (token[0] === TokenType.OpenSquare) squareDepthUsed++;
          if (token[0] === TokenType.CloseSquare) squareDepthUsed--;
          if (token[0] === TokenType.String) {
            return stringWords(token[4].value).some((word) =>
              liveSymbols.has(word)
            );
          }
          return (
            token[0] === TokenType.Ident &&
            squareDepthUsed > 0 &&
            liveSymbols.has(token[4].value)
          );
        });

        let squareDepth = 0;
        decl.value = rewrite(
          decl.value,
          (token) => {
            if (token[0] === TokenType.Whitespace) return ' ';
            if (token[0] === TokenType.OpenSquare) squareDepth++;
            if (token[0] === TokenType.CloseSquare) squareDepth--;
            if (token[0] === TokenType.String) {
              const value = stringWords(token[4].value)
                .map((word) => {
                  const normalized = /^\.+$/.test(word) ? '.' : word;
                  const symbol = symbolTable.get(word);
                  return isLive && symbol ? symbol.ident : normalized;
                })
                .join(' ');
              return serializeString(value, token[1][0]);
            }
            const symbol =
              token[0] === TokenType.Ident &&
              squareDepth > 0 &&
              symbolTable.get(token[4].value);
            if (!symbol) return;
            return isLive ? symbol.ident : undefined;
          },
          undefined,
          parsedTokens
        );
      }

      defSites = [];
      useSites = [];
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
