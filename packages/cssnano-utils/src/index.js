import lengthUnits from './lengthUnits.js';
import mathFunctions from './mathFunctions.js';
import mathFunctionArgumentRanges from './mathFunctionArgumentRanges.js';
import rawCache from './rawCache.js';
import sameParent from './sameParent.js';
import {
  TokenType,
  applyEdits,
  balancedTokens,
  decoded,
  numeric,
  numericSource,
  tokenEnd,
  tokenStart,
  tokens,
} from './value.js';

/** @type {{rawCache: typeof rawCache, sameParent: typeof sameParent, TokenType: typeof TokenType, applyEdits: typeof applyEdits, balancedTokens: typeof balancedTokens, decoded: typeof decoded, lengthUnits: typeof lengthUnits, mathFunctions: typeof mathFunctions, mathFunctionArgumentRanges: typeof mathFunctionArgumentRanges, numeric: typeof numeric, numericSource: typeof numericSource, tokenEnd: typeof tokenEnd, tokenStart: typeof tokenStart, tokens: typeof tokens}} */
const cssnanoUtils = {
  rawCache,
  sameParent,
  TokenType,
  decoded,
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
