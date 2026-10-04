import calcSumFunctions from './calcSumFunctions.js';
import lengthUnits from './lengthUnits.js';
import mathFunctions from './mathFunctions.js';
import mathFunctionArgumentRanges from './mathFunctionArgumentRanges.js';
import rawCache from './rawCache.js';
import isAnonymousLayer from './isAnonymousLayer.js';
import isImportantComment from './isImportantComment.js';
import sameParent, { sameContainer } from './sameParent.js';
import {
  TokenType,
  applyEdits,
  balancedTokens,
  closeForOpening,
  decoded,
  endsWithEscapingBackslash,
  numeric,
  numericSource,
  tokenEnd,
  tokenStart,
  tokens,
} from './value.js';

/* CSS keyword matching is ASCII-case-insensitive; avoid Unicode case folding
 * and the replacement callback on the overwhelmingly common lowercase path. */
const asciiUpperCase = /[A-Z]/v;

/** @param {string} value @return {string} */
function asciiLowerCase(value) {
  if (!asciiUpperCase.test(value)) return value;
  return value.replace(/[A-Z]/gv, (character) => character.toLowerCase());
}

/** @type {{rawCache: typeof rawCache, sameParent: typeof sameParent, sameContainer: typeof sameContainer, isAnonymousLayer: typeof isAnonymousLayer, isImportantComment: typeof isImportantComment, TokenType: typeof TokenType, applyEdits: typeof applyEdits, asciiLowerCase: typeof asciiLowerCase, balancedTokens: typeof balancedTokens, calcSumFunctions: typeof calcSumFunctions, closeForOpening: typeof closeForOpening, decoded: typeof decoded, endsWithEscapingBackslash: typeof endsWithEscapingBackslash, lengthUnits: typeof lengthUnits, mathFunctions: typeof mathFunctions, mathFunctionArgumentRanges: typeof mathFunctionArgumentRanges, numeric: typeof numeric, numericSource: typeof numericSource, tokenEnd: typeof tokenEnd, tokenStart: typeof tokenStart, tokens: typeof tokens}} */
const cssnanoUtils = {
  rawCache,
  sameParent,
  sameContainer,
  isAnonymousLayer,
  isImportantComment,
  TokenType,
  asciiLowerCase,
  calcSumFunctions,
  closeForOpening,
  decoded,
  endsWithEscapingBackslash,
  lengthUnits,
  mathFunctions,
  mathFunctionArgumentRanges,
  numeric,
  applyEdits,
  balancedTokens,
  numericSource,
  tokenEnd,
  tokenStart,
  tokens,
};

const moduleExports = cssnanoUtils;

export { moduleExports as default, moduleExports as 'module.exports' };
