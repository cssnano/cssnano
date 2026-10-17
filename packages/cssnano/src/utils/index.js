import calcSumFunctions from './calcSumFunctions.js';
import lengthUnits from './lengthUnits.js';
import mathFunctions from './mathFunctions.js';
import rawCache from './rawCache.js';
import isAnonymousLayer from './isAnonymousLayer.js';
import isCSSWhitespace from './isCSSWhitespace.js';
import presetTargets, { targetOptionKeys } from './presetTargets.js';
import isHexDigitCode from './isHexDigitCode.js';
import isImportantComment from './isImportantComment.js';
import {
  TokenType,
  applyEdits,
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

/** @type {{rawCache: typeof rawCache, isAnonymousLayer: typeof isAnonymousLayer, isCSSWhitespace: typeof isCSSWhitespace, presetTargets: typeof presetTargets, targetOptionKeys: typeof targetOptionKeys, isHexDigitCode: typeof isHexDigitCode, isImportantComment: typeof isImportantComment, TokenType: typeof TokenType, applyEdits: typeof applyEdits, asciiLowerCase: typeof asciiLowerCase, balancedTokens: typeof balancedTokens, calcSumFunctions: typeof calcSumFunctions, closeForOpening: typeof closeForOpening, decoded: typeof decoded, endsWithEscapingBackslash: typeof endsWithEscapingBackslash, lengthUnits: typeof lengthUnits, mathFunctions: typeof mathFunctions, numeric: typeof numeric, tokenEnd: typeof tokenEnd, tokenStart: typeof tokenStart, tokens: typeof tokens}} */
const cssnanoUtils = {
  rawCache,
  isAnonymousLayer,
  isCSSWhitespace,
  presetTargets,
  targetOptionKeys,
  isHexDigitCode,
  isImportantComment,
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
  balancedTokens,
  tokenEnd,
  tokenStart,
  tokens,
};

/** @typedef {import('./featureKeys.js').FeatureKey} FeatureKey */
/** @typedef {import('./browserBugs.js').BugKey} BugKey */

/**
 * Options that select browser targets. They match browserslist's options, so
 * the shared resolver can pass them on unchanged.
 * @typedef {{overrideBrowserslist?: string | string[] | undefined, stats?: string | Record<string, Record<string, number>> | undefined, path?: string | undefined, env?: string | undefined}} TargetOptions
 */

const moduleExports = cssnanoUtils;

export { moduleExports as default, moduleExports as 'module.exports' };
