import { list } from 'postcss';
import cssnanoUtils from 'cssnano-utils';

import { hasValidFunctionSyntax } from '../shorthandValueGrammar.js';

const { TokenType, lengthUnits, tokens } = cssnanoUtils;

const validSpacingFunctions = new Set([
  'calc',
  'min',
  'max',
  'clamp',
  'round',
  'mod',
  'rem',
  'abs',
  'sign',
  'hypot',
  'var',
  'env',
]);

/** @param {import('@csstools/css-tokenizer').CSSToken[]} tokenList @return {boolean} */
function isValidSpacingFunction(tokenList) {
  const name = /** @type {{ value?: string } | undefined} */ (
    tokenList[0][4]
  )?.value?.toLowerCase();
  if (!name || !validSpacingFunctions.has(name)) return false;
  let parens = 0;
  for (let i = 0; i < tokenList.length; i++) {
    const type = tokenList[i][0];
    if (type === TokenType.Function || type === TokenType.OpenParen) parens++;
    else if (type === TokenType.CloseParen) {
      parens--;
      if (parens === 0 && i < tokenList.length - 1) return false;
      if (parens < 0) return false;
    }
  }
  return parens === 0 && hasValidFunctionSyntax(tokenList);
}

/**
 * Validates whether a token represents a valid <length> for border-spacing.
 * Border-spacing only accepts non-negative lengths (no percentages or negative numbers).
 *
 * @param {string} val
 * @return {boolean}
 */
function isValidSpacing(val) {
  const t = Array.from(tokens(val));
  if (t.length === 0) return false;
  const first = t[0];
  if (first[0] === TokenType.Dimension) {
    const d =
      /** @type {{ unit?: string, signCharacter?: string, value?: number } | undefined} */ (
        first[4]
      );
    return (
      t.length === 1 &&
      typeof d?.unit === 'string' &&
      lengthUnits.has(d.unit.toLowerCase()) &&
      d.signCharacter !== '-' &&
      typeof d.value === 'number' &&
      d.value >= 0
    );
  }
  if (first[0] === TokenType.Number) {
    const d =
      /** @type {{ signCharacter?: string, value?: number } | undefined} */ (
        first[4]
      );
    return t.length === 1 && d?.signCharacter !== '-' && d?.value === 0;
  }
  return first[0] === TokenType.Function && isValidSpacingFunction(t);
}

/**
 * @param {import('postcss').Rule} rule
 * @param {import('postcss').Declaration[]} [declarations]
 * @return {void}
 */
export function reduceBorderSpacing(rule, declarations) {
  const decls =
    declarations ??
    /** @type {import('postcss').Declaration[]} */ (
      rule.nodes.filter(
        (n) => n.type === 'decl' && n.prop.toLowerCase() === 'border-spacing'
      )
    );

  for (const decl of decls) {
    if (decl.prop.toLowerCase() !== 'border-spacing') continue;
    const value = list.space(decl.value);
    if (
      value.length === 2 &&
      value[0] === value[1] &&
      isValidSpacing(value[0])
    ) {
      decl.value = value[0];
    }
  }
}
