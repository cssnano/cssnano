/**
 * @typedef {'forgiving-selector-list'
 *   | 'selector-list'
 *   | 'relative-selector-list'
 *   | 'compound-selector'
 *   | 'an-plus-b-of'
 *   | 'an-plus-b'
 *   | 'ident-or-string-list'
 *   | 'ident'
 * } ArgumentGrammar
 */

/** @typedef {ArgumentGrammar} GrammarEntry */

export const legacyPseudoElements = new Set([
  'before',
  'after',
  'first-letter',
  'first-line',
]);

export const pseudoElements = new Set([
  'before',
  'after',
  'first-letter',
  'first-line',
  'marker',
  'placeholder',
  'selection',
  'backdrop',
  'file-selector-button',
  'target-text',
  'cue',
]);

export const operators = new Set(['=', '~', '|=', '^', '$', '*']);
export const safePseudos = new Set([
  'hover',
  'focus',
  'active',
  'visited',
  'link',
]);

/**
 * Registry mapping recognized functional pseudos to their declarative argument grammar.
 * Unknown/framework functions stay opaque and retain their exact source.
 * @type {Map<string, ArgumentGrammar>}
 */
export const selectorGrammar = new Map([
  ['is', 'forgiving-selector-list'],
  ['where', 'forgiving-selector-list'],
  ['matches', 'forgiving-selector-list'],
  ['not', 'selector-list'],
  ['has', 'relative-selector-list'],
  ['host', 'compound-selector'],
  ['host-context', 'compound-selector'],
  ['slotted', 'compound-selector'],
  ['nth-child', 'an-plus-b-of'],
  ['nth-last-child', 'an-plus-b-of'],
  ['nth-of-type', 'an-plus-b'],
  ['nth-last-of-type', 'an-plus-b'],
  ['nth-col', 'an-plus-b'],
  ['nth-last-col', 'an-plus-b'],
  ['lang', 'ident-or-string-list'],
  ['dir', 'ident'],
]);
