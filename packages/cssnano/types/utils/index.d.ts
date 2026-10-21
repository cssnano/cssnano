import calcSumFunctions from './calcSumFunctions.js';
import lengthUnits from './lengthUnits.js';
import mathFunctions from './mathFunctions.js';
import rawCache from './rawCache.js';
import isAnonymousLayer from './isAnonymousLayer.js';
import isCSSWhitespace from './isCSSWhitespace.js';
import isHexDigitCode from './isHexDigitCode.js';
import isImportantComment from './isImportantComment.js';
import { assignValue, sourceValue } from './declValue.js';
import vendorUnprefixed from './vendorUnprefixed.js';
import { isSubstitutionFunction } from './substitution.js';
import { TokenType, applyEdits, balancedTokens, closeForOpening, decoded, endsWithEscapingBackslash, numeric, tokenEnd, tokenStart, tokens } from './value.js';
/** @param {string} value @return {string} */
declare function asciiLowerCase(value: string): string;
export type FeatureKey = import('./featureKeys.js').FeatureKey;
export type BugKey = import('./browserBugs.js').BugKey;
/** @typedef {import('./featureKeys.js').FeatureKey} FeatureKey */
/** @typedef {import('./browserBugs.js').BugKey} BugKey */
declare const moduleExports: {
    rawCache: typeof rawCache;
    assignValue: typeof assignValue;
    sourceValue: typeof sourceValue;
    isAnonymousLayer: typeof isAnonymousLayer;
    isCSSWhitespace: typeof isCSSWhitespace;
    isHexDigitCode: typeof isHexDigitCode;
    isImportantComment: typeof isImportantComment;
    vendorUnprefixed: typeof vendorUnprefixed;
    isSubstitutionFunction: typeof isSubstitutionFunction;
    TokenType: typeof TokenType;
    applyEdits: typeof applyEdits;
    asciiLowerCase: typeof asciiLowerCase;
    balancedTokens: typeof balancedTokens;
    calcSumFunctions: typeof calcSumFunctions;
    closeForOpening: typeof closeForOpening;
    decoded: typeof decoded;
    endsWithEscapingBackslash: typeof endsWithEscapingBackslash;
    lengthUnits: typeof lengthUnits;
    mathFunctions: typeof mathFunctions;
    numeric: typeof numeric;
    tokenEnd: typeof tokenEnd;
    tokenStart: typeof tokenStart;
    tokens: typeof tokens;
};
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map