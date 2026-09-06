import { isFunction, isIdent, isString, isUrl, name } from '../lib/tokenize.js';
import listStyleTypes from './listStyleTypes.json' with { type: 'json' };

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

const imageFunctions = new Set([
  'image',
  'image-set',
  'element',
  'cross-fade',
  'linear-gradient',
  'radial-gradient',
  'conic-gradient',
  'repeating-linear-gradient',
  'repeating-radial-gradient',
  'repeating-conic-gradient',
]);

const typeFunctions = new Set(['symbols', 'counter', 'counters']);

/**
 * @param {import('../lib/tokenize.js').Term} term
 * @return {'none' | 'position' | 'image' | 'type' | null}
 */
function classifyTerm(term) {
  if (isIdent(term)) {
    const identName = name(term);
    if (identName === 'none') {
      return 'none';
    }
    if (definedPosition.has(identName)) {
      return 'position';
    }
    if (definedTypes.has(identName) || !cssWideKeywords.has(identName)) {
      return 'type';
    }
    return null;
  }
  if (isUrl(term)) {
    return 'image';
  }
  if (isFunction(term)) {
    const fn = name(term);
    if (typeFunctions.has(fn)) {
      return 'type';
    }
    if (imageFunctions.has(fn)) {
      return 'image';
    }
    return null;
  }
  if (isString(term)) {
    return 'type';
  }
  return null;
}

/**
 * @param {import('../lib/tokenize.js').Term[]} noneTerms
 * @param {import('../lib/tokenize.js').Term | null} type
 * @param {import('../lib/tokenize.js').Term | null} image
 * @return {{ type: import('../lib/tokenize.js').Term | null, image: import('../lib/tokenize.js').Term | null } | null}
 */
function resolveNoneTerms(noneTerms, type, image) {
  if (noneTerms.length === 1) {
    if (type && image) {
      return null;
    }
    return type ? { type, image: noneTerms[0] } : { type: noneTerms[0], image };
  }
  if (noneTerms.length === 2) {
    if (type || image) {
      return null;
    }
    return { type: noneTerms[0], image: noneTerms[1] };
  }
  if (noneTerms.length > 2) {
    return null;
  }
  return { type, image };
}

/**
 * @param {import('../lib/tokenize.js').Term[]} listStyle
 * @return {string | null}
 */
function listStyleNormalizer(listStyle) {
  if (listStyle.length > 3) {
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
    const kind = classifyTerm(decl);
    if (!kind) {
      return null;
    }
    if (kind === 'none') {
      noneTerms.push(decl);
    } else if (kind === 'position') {
      if (position) {
        return null;
      }
      position = decl;
    } else if (kind === 'image') {
      if (image) {
        return null;
      }
      image = decl;
    } else {
      if (type) {
        return null;
      }
      type = decl;
    }
  }

  const resolved = resolveNoneTerms(noneTerms, type, image);
  if (!resolved) {
    return null;
  }

  return [resolved.type?.raw, position?.raw, resolved.image?.raw]
    .filter(Boolean)
    .join(' ');
}

export default listStyleNormalizer;
