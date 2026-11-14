import cssnanoUtils from '#utils';
import { isCssWideKeyword } from '../isCssWideKeyword.js';
import { isUnresolved } from '../../../../ir/unresolved.js';
import { splitValue } from '../valueComponents.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {Parser, PairFamily} from './pairForms.js'; */

/**
 * @param {ReadonlySet<string>} keywords - lowercase
 * @return {Parser}
 */
export function keywordParser(keywords) {
  return (decl) => {
    const trimmed = decl.value.trim();
    const lower = asciiLowerCase(trimmed);
    return keywords.has(lower) || isCssWideKeyword(trimmed) ? trimmed : null;
  };
}

/**
 * The one component of a value, or undefined when a top-level comma, slash or
 * whitespace divides it. Brackets keep their contents together.
 *
 * @param {import('../blockDeclarations.js').DeclarationItem} decl
 * @return {import('../valueComponents.js').Component | undefined}
 */
export function singleComponent(decl) {
  const parts = splitValue(decl.value, '/', decl.tokens);
  if (parts?.length !== 1) return undefined;
  const [{ components }] = parts;
  return components.length === 1 ? components[0] : undefined;
}

/**
 * The tokens of a value whose top-level components each hold one token, or
 * undefined when a slash, comma or function divides or nests it.
 *
 * @param {import('../blockDeclarations.js').DeclarationItem} decl
 * @return {import('@csstools/css-tokenizer').CSSToken[] | undefined}
 */
export function componentTokens(decl) {
  const parts = splitValue(decl.value, '/', decl.tokens);
  if (parts?.length !== 1) return undefined;
  const [{ components }] = parts;
  if (components.some((component) => component.tokens.length !== 1)) {
    return undefined;
  }
  return components.map((component) => component.tokens[0]);
}

/**
 * @param {string} shorthand
 * @param {string[]} longhands
 * @param {Omit<PairFamily, 'shorthand' | 'longhands' | 'aliases' | 'supportKey'> & { aliases?: string[], supportKey?: string | null }} rest
 * @return {PairFamily}
 */
export function family(shorthand, longhands, rest) {
  const { aliases = [], supportKey = shorthand, ...behavior } = rest;
  return {
    shorthand,
    longhands,
    aliases: new Set(aliases),
    supportKey,
    ...behavior,
  };
}

/**
 * A single component of the component's own type. A colour function such as
 * `rgb(0,0,0)` is one component. A substitution has no known type and a math
 * function is not compared, so both are left alone.
 *
 * @param {(text: string, tokens: import('@csstools/css-tokenizer').CSSToken[] | undefined, start: number, end: number) => boolean} is
 * @return {Parser}
 */
export function ruleComponent(is) {
  return (decl) => {
    const trimmed = decl.value.trim();
    if (isCssWideKeyword(trimmed)) return trimmed;
    const component = singleComponent(decl);
    if (
      !component ||
      isUnresolved(component.tokens, 0, component.tokens.length)
    )
      return null;
    return is(trimmed, component.tokens, 0, component.tokens.length)
      ? trimmed
      : null;
  };
}
