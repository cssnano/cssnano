import calcSumFunctions from './calcSumFunctions.js';
import lengthUnits from './lengthUnits.js';
import mathFunctions from './mathFunctions.js';
import rawCache from './rawCache.js';
import isAnonymousLayer from './isAnonymousLayer.js';
import isCSSWhitespace from './isCSSWhitespace.js';
import isHexDigitCode from './isHexDigitCode.js';
import isImportantComment from './isImportantComment.js';
import { sourceValue } from './sourceText.js';
import vendorUnprefixed from './vendorUnprefixed.js';
import { isSubstitutionFunction } from './substitution.js';
import {
  TokenType,
  applyEdits,
  balancedStructure,
  balancedTokens,
  closeForOpening,
  decoded,
  endsWithEscapingBackslash,
  numeric,
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
  return value.replaceAll(/[A-Z]/gv, (character) => character.toLowerCase());
}

/** @type {{rawCache: typeof rawCache, sourceValue: typeof sourceValue, isAnonymousLayer: typeof isAnonymousLayer, isCSSWhitespace: typeof isCSSWhitespace, isHexDigitCode: typeof isHexDigitCode, isImportantComment: typeof isImportantComment, vendorUnprefixed: typeof vendorUnprefixed, isSubstitutionFunction: typeof isSubstitutionFunction, TokenType: typeof TokenType, applyEdits: typeof applyEdits, asciiLowerCase: typeof asciiLowerCase, balancedStructure: typeof balancedStructure, balancedTokens: typeof balancedTokens, calcSumFunctions: typeof calcSumFunctions, closeForOpening: typeof closeForOpening, decoded: typeof decoded, endsWithEscapingBackslash: typeof endsWithEscapingBackslash, lengthUnits: typeof lengthUnits, mathFunctions: typeof mathFunctions, numeric: typeof numeric, tokenEnd: typeof tokenEnd, tokenStart: typeof tokenStart, tokens: typeof tokens}} */
const cssnanoUtils = {
  rawCache,
  sourceValue,
  isAnonymousLayer,
  isCSSWhitespace,
  isHexDigitCode,
  isImportantComment,
  vendorUnprefixed,
  isSubstitutionFunction,
  TokenType,
  asciiLowerCase,
  calcSumFunctions,
  closeForOpening,
  decoded,
  endsWithEscapingBackslash,
  lengthUnits,
  mathFunctions,
  numeric,
  applyEdits,
  balancedStructure,
  balancedTokens,
  tokenEnd,
  tokenStart,
  tokens,
};

/** @typedef {import('./featureKeys.js').FeatureKey} FeatureKey */
/** @typedef {import('./browserBugs.js').BugKey} BugKey */

const moduleExports = cssnanoUtils;

export { moduleExports as default, moduleExports as 'module.exports' };
