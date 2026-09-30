import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';
import { cssSel2, cssSel3, isSupportedCached } from './supportCache.js';

const { asciiLowerCase } = cssnanoUtils;

const level2Sel = new Set(['=', '~=', '|=']);
const attributeOperatorCharacters = new Set(['~', '|', '^', '$', '*']);

/**
 * Position within an attribute selector, `[ns|name operator value modifier]`.
 * `name` awaits the qualified name; `wildcard` follows `*`; `prefix` follows
 * an ident that is a namespace prefix or the local name; `separator` follows
 * `|` after such an ident; `localName` follows `*|` or a leading `|`;
 * `matcher` follows the complete name; `equals` follows `~ | ^ $ *`;
 * `value` follows `=`; `modifier` follows the value; `done` follows the
 * modifier. Attribute selectors do not nest.
 *
 * @typedef {'none' | 'name' | 'wildcard' | 'prefix' | 'separator' | 'localName' | 'matcher' | 'equals' | 'value' | 'modifier' | 'done'} AttributeStage
 */

/**
 * @typedef {object} AttributeScanState
 * @property {AttributeStage} attributeStage
 * @property {TokenType[]} delimiters
 */

/**
 * Close an attribute selector. A bare `[name]` needs Selectors 2; a matcher
 * was already checked. Returns false when the selector is incomplete.
 *
 * @param {AttributeScanState} state
 * @param {string[] | undefined} browsers
 * @return {boolean}
 */
function closeAttribute(state, browsers) {
  const { attributeStage: stage } = state;
  const hasMatcher = stage === 'modifier' || stage === 'done';
  if (!hasMatcher) {
    if (stage !== 'prefix' && stage !== 'localName' && stage !== 'matcher') {
      return false;
    }
    if (!isSupportedCached(cssSel2, browsers)) return false;
  }
  state.delimiters.pop();
  state.attributeStage = 'none';
  return true;
}

/**
 * Whitespace and comments may surround the name, the matcher and the value,
 * but not split a namespace separator or a matcher.
 *
 * @param {AttributeScanState} state
 * @return {boolean}
 */
function skipAttributeTrivia(state) {
  const { attributeStage: stage } = state;
  if (stage === 'prefix') state.attributeStage = 'matcher';
  return (
    stage !== 'wildcard' &&
    stage !== 'separator' &&
    stage !== 'localName' &&
    stage !== 'equals'
  );
}

/**
 * Begin the matcher with `=` or with an operator character that `=` must
 * follow directly. `=`, `~=` and `|=` need Selectors 2, the rest Selectors 3.
 *
 * @param {AttributeScanState} state
 * @param {string} character
 * @param {string[] | undefined} browsers
 * @return {boolean}
 */
function startMatcher(state, character, browsers) {
  if (character === '=') {
    state.attributeStage = 'value';
    return isSupportedCached(cssSel2, browsers);
  }
  if (!attributeOperatorCharacters.has(character)) return false;
  state.attributeStage = 'equals';
  const feature = level2Sel.has(`${character}=`) ? cssSel2 : cssSel3;
  return isSupportedCached(feature, browsers);
}

/**
 * @param {AttributeScanState} state
 * @param {TokenType} type
 * @param {string} value
 * @return {boolean}
 */
function startAttributeName(state, type, value) {
  if (type === TokenType.Ident) {
    state.attributeStage = 'prefix';
  } else if (type === TokenType.Delim && value === '*') {
    state.attributeStage = 'wildcard';
  } else if (type === TokenType.Delim && value === '|') {
    state.attributeStage = 'localName';
  } else {
    return false;
  }
  return true;
}

/**
 * After `ns|`: the local name, or the `=` of a `|=` matcher.
 *
 * @param {AttributeScanState} state
 * @param {TokenType} type
 * @param {string} value
 * @param {string[] | undefined} browsers
 * @return {boolean}
 */
function afterSeparator(state, type, value, browsers) {
  if (type === TokenType.Ident) {
    state.attributeStage = 'matcher';
    return true;
  }
  return type === TokenType.Delim && startMatcher(state, value, browsers);
}

/**
 * After a prefix or local name: `|` separates a namespace, anything else
 * starts the matcher.
 *
 * @param {AttributeScanState} state
 * @param {boolean} isDelim
 * @param {string} value
 * @param {string[] | undefined} browsers
 * @return {boolean}
 */
function afterPrefix(state, isDelim, value, browsers) {
  if (isDelim && value === '|') {
    state.attributeStage = 'separator';
    return true;
  }
  return isDelim && startMatcher(state, value, browsers);
}

/**
 * The modifier after an attribute value: `s` is unsupported and `i` needs
 * the case-insensitivity feature.
 *
 * @param {AttributeScanState} state
 * @param {string} value
 * @param {string[] | undefined} browsers
 * @return {boolean}
 */
function readModifier(state, value, browsers) {
  state.attributeStage = 'done';
  return (
    asciiLowerCase(value) === 'i' &&
    isSupportedCached('css-case-insensitive', browsers)
  );
}

/**
 * Advance the attribute selector stage by one token.
 *
 * @param {AttributeScanState} state
 * @param {TokenType} type
 * @param {string} value
 * @param {string[] | undefined} browsers
 * @return {boolean}
 */
function advanceAttribute(state, type, value, browsers) {
  if (type === TokenType.Whitespace || type === TokenType.Comment) {
    return skipAttributeTrivia(state);
  }
  if (type === TokenType.CloseSquare) return closeAttribute(state, browsers);
  const isIdent = type === TokenType.Ident;
  const isDelim = type === TokenType.Delim;
  switch (state.attributeStage) {
    case 'name':
      return startAttributeName(state, type, value);
    case 'wildcard':
      state.attributeStage = 'localName';
      return isDelim && value === '|';
    case 'prefix':
      return afterPrefix(state, isDelim, value, browsers);
    case 'separator':
      return afterSeparator(state, type, value, browsers);
    case 'localName':
      state.attributeStage = 'matcher';
      return isIdent;
    case 'equals':
      state.attributeStage = 'value';
      return isDelim && value === '=';
    case 'value':
      state.attributeStage = 'modifier';
      return isIdent || type === TokenType.String;
    case 'modifier':
      return isIdent && readModifier(state, value, browsers);
    case 'matcher':
      return isDelim && startMatcher(state, value, browsers);
    default:
      return false;
  }
}

export { advanceAttribute };
