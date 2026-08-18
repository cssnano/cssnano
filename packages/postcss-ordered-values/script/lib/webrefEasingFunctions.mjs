import { REFERENCE, keywordTerminals } from '../../../../util/webref.mjs';

/**
 * Derives the terminal keywords and functions accepted by <easing-function>.
 * Kept free of I/O so that it can be unit tested.
 *
 * @typedef {object} WebrefDefinition
 * @property {string} name
 * @property {string} [syntax]
 *
 * @typedef {object} WebrefData
 * @property {WebrefDefinition[]} types
 *
 * @typedef {object} EasingFunctions
 * @property {string[]} keywords
 * @property {string[]} functions
 */

/**
 * @param {WebrefData} data
 * @return {EasingFunctions}
 */
export function buildEasingFunctions(data) {
  const types = new Map(data.types.map((type) => [type.name, type]));
  /** @type {Set<string>} */
  const keywords = new Set();
  /** @type {Set<string>} */
  const functions = new Set();
  /** @type {Set<string>} */
  const visited = new Set();

  /** @param {string} name */
  function visit(name) {
    if (visited.has(name)) {
      return;
    }
    visited.add(name);

    const type = types.get(name);
    if (!type) {
      throw new Error(`webref does not define <${name}>`);
    }
    const syntax = type.syntax;
    if (!syntax) {
      throw new Error(`webref does not provide syntax for <${name}>`);
    }

    for (const keyword of keywordTerminals(syntax)) {
      keywords.add(keyword.toLowerCase());
    }
    for (const match of syntax.matchAll(REFERENCE)) {
      const reference = match[1] || match[2];
      if (reference.endsWith('()')) {
        functions.add(reference.slice(0, -2).toLowerCase());
      } else if (!match[1]) {
        visit(reference);
      }
    }
  }

  visit('easing-function');
  return {
    keywords: [...keywords].toSorted(),
    functions: [...functions].toSorted(),
  };
}

/**
 * @param {EasingFunctions} data
 * @return {void}
 */
export function validate(data) {
  const expectedKeywords = [
    'ease',
    'ease-in',
    'ease-in-out',
    'ease-out',
    'linear',
    'step-end',
    'step-start',
  ];
  const expectedFunctions = ['cubic-bezier', 'linear', 'steps'];

  for (const keyword of expectedKeywords) {
    if (!data.keywords.includes(keyword)) {
      throw new Error(`Expected easing keywords to include ${keyword}`);
    }
  }
  for (const functionName of expectedFunctions) {
    if (!data.functions.includes(functionName)) {
      throw new Error(`Expected easing functions to include ${functionName}`);
    }
  }
}

/**
 * @param {EasingFunctions} data
 * @return {string}
 */
export function serialize(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}
