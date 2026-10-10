import calcSumFunctions from './calcSumFunctions.js';
import lengthUnits from './lengthUnits.js';
import mathFunctions from './mathFunctions.js';
import rawCache from './rawCache.js';
import isAnonymousLayer from './isAnonymousLayer.js';
import isHexDigitCode from './isHexDigitCode.js';
import isImportantComment from './isImportantComment.js';
import { TokenType, applyEdits, balancedTokens, closeForOpening, decoded, endsWithEscapingBackslash, numeric, tokenEnd, tokenStart, tokens } from './value.js';
/** @param {string} value @return {string} */
declare function asciiLowerCase(value: string): string;
declare const moduleExports: {
    rawCache: typeof rawCache;
    isAnonymousLayer: typeof isAnonymousLayer;
    isHexDigitCode: typeof isHexDigitCode;
    isImportantComment: typeof isImportantComment;
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