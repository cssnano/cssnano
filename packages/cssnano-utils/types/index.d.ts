import calcSumFunctions from './calcSumFunctions.js';
import lengthUnits from './lengthUnits.js';
import mathFunctions from './mathFunctions.js';
import mathFunctionArgumentRanges from './mathFunctionArgumentRanges.js';
import rawCache from './rawCache.js';
import sameParent from './sameParent.js';
import { TokenType, applyEdits, balancedTokens, closeForOpening, decoded, numeric, numericSource, tokenEnd, tokenStart, tokens } from './value.js';
/** @param {string} value @return {string} */
declare function asciiLowerCase(value: string): string;
declare const moduleExports: {
    rawCache: typeof rawCache;
    sameParent: typeof sameParent;
    TokenType: typeof TokenType;
    applyEdits: typeof applyEdits;
    asciiLowerCase: typeof asciiLowerCase;
    balancedTokens: typeof balancedTokens;
    calcSumFunctions: typeof calcSumFunctions;
    closeForOpening: typeof closeForOpening;
    decoded: typeof decoded;
    lengthUnits: typeof lengthUnits;
    mathFunctions: typeof mathFunctions;
    mathFunctionArgumentRanges: typeof mathFunctionArgumentRanges;
    numeric: typeof numeric;
    numericSource: typeof numericSource;
    tokenEnd: typeof tokenEnd;
    tokenStart: typeof tokenStart;
    tokens: typeof tokens;
};
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map