import calcSumFunctions from './calcSumFunctions.js';
import lengthUnits from './lengthUnits.js';
import mathFunctions from './mathFunctions.js';
import rawCache from './rawCache.js';
import isAnonymousLayer from './isAnonymousLayer.js';
import isCSSWhitespace from './isCSSWhitespace.js';
import isAsciiDigit from './isAsciiDigit.js';
import isHexColorDigits from './isHexColorDigits.js';
import isHexDigitCode from './isHexDigitCode.js';
import isImportantComment, {
  isImportantCommentToken,
} from './isImportantComment.js';
import { sourceValue } from './sourceText.js';
import vendorUnprefixed from './vendorUnprefixed.js';
import asciiLowerCase from './asciiLowerCase.js';
import {
  isSubstitutionFunction,
  isSubstitutionToken,
  substitutionFunctions,
} from './substitution.js';
import {
  TokenType,
  applyEdits,
  balancedStructure,
  balancedTokens,
  closeForOpening,
  decoded,
  endsWithEscapingBackslash,
  isTrivia,
  numeric,
  skipTrivia,
  tokenEnd,
  tokenStart,
  tokens,
} from './value.js';

/** @type {{rawCache: typeof rawCache, sourceValue: typeof sourceValue, isAnonymousLayer: typeof isAnonymousLayer, isCSSWhitespace: typeof isCSSWhitespace, isAsciiDigit: typeof isAsciiDigit, isHexColorDigits: typeof isHexColorDigits, isHexDigitCode: typeof isHexDigitCode, isImportantComment: typeof isImportantComment, isImportantCommentToken: typeof isImportantCommentToken, isTrivia: typeof isTrivia, skipTrivia: typeof skipTrivia, vendorUnprefixed: typeof vendorUnprefixed, isSubstitutionFunction: typeof isSubstitutionFunction, isSubstitutionToken: typeof isSubstitutionToken, substitutionFunctions: typeof substitutionFunctions, TokenType: typeof TokenType, applyEdits: typeof applyEdits, asciiLowerCase: typeof asciiLowerCase, balancedStructure: typeof balancedStructure, balancedTokens: typeof balancedTokens, calcSumFunctions: typeof calcSumFunctions, closeForOpening: typeof closeForOpening, decoded: typeof decoded, endsWithEscapingBackslash: typeof endsWithEscapingBackslash, lengthUnits: typeof lengthUnits, mathFunctions: typeof mathFunctions, numeric: typeof numeric, tokenEnd: typeof tokenEnd, tokenStart: typeof tokenStart, tokens: typeof tokens}} */
const cssnanoUtils = {
  rawCache,
  sourceValue,
  isAnonymousLayer,
  isCSSWhitespace,
  isAsciiDigit,
  isHexColorDigits,
  isHexDigitCode,
  isImportantComment,
  isImportantCommentToken,
  isTrivia,
  skipTrivia,
  vendorUnprefixed,
  isSubstitutionFunction,
  isSubstitutionToken,
  substitutionFunctions,
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
