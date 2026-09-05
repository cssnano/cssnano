import cssnanoUtils from 'cssnano-utils';
import { isFunction, isIdent, isUrl, name } from '../lib/tokenize.js';
import listStyleTypes from './listStyleTypes.json' with { type: 'json' };

const { TokenType } = cssnanoUtils;

const definedTypes = new Set(listStyleTypes['list-style-type']);

const definedPosition = new Set(['inside', 'outside']);

const cssWideKeywords = new Set([
  'initial',
  'inherit',
  'unset',
  'revert',
  'revert-layer',
  'default',
]);

/**
 * @param {import('../lib/tokenize.js').Term[]} listStyle
 * @return {string | null}
 */
function listStyleNormalizer(listStyle) {
  if (listStyle.length > 3) {
    return null;
  }

  if (
    listStyle.some((decl) => isIdent(decl) && cssWideKeywords.has(name(decl)))
  ) {
    return null;
  }

  /** @type {import('../lib/tokenize.js').Term | null} */
  let type = null;
  /** @type {import('../lib/tokenize.js').Term | null} */
  let position = null;
  /** @type {import('../lib/tokenize.js').Term | null} */
  let image = null;
  /** @type {import('../lib/tokenize.js').Term[]} */
  const noneTerms = [];

  for (const decl of listStyle) {
    if (isIdent(decl) && name(decl) === 'none') {
      noneTerms.push(decl);
    } else if (isIdent(decl) && definedPosition.has(name(decl))) {
      if (position) return null;
      position = decl;
    } else if (isUrl(decl) || (isFunction(decl) && name(decl) !== 'symbols')) {
      if (image) return null;
      image = decl;
    } else if (
      definedTypes.has(name(decl)) ||
      (isFunction(decl) && name(decl) === 'symbols') ||
      (decl.tokens.length === 1 && decl.tokens[0][0] === TokenType.String) ||
      (isIdent(decl) &&
        !definedPosition.has(name(decl)) &&
        !cssWideKeywords.has(name(decl)))
    ) {
      if (type) return null;
      type = decl;
    } else {
      return null;
    }
  }

  if (noneTerms.length === 1) {
    if (type && image) return null;
    if (type) {
      image = noneTerms[0];
    } else {
      type = noneTerms[0];
    }
  } else if (noneTerms.length === 2) {
    if (type || image) return null;
    type = noneTerms[0];
    image = noneTerms[1];
  } else if (noneTerms.length > 2) {
    return null;
  }

  return [type?.raw, position?.raw, image?.raw].filter(Boolean).join(' ');
}

export default listStyleNormalizer;
