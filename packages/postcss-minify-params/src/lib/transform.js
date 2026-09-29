import cssnanoUtils from 'cssnano-utils';
import minifyMediaAll from './media.js';
import {
  minifyAspectRatios,
  minifyWhitespace,
  parentIndexes,
} from './whitespace.js';
import {
  endsWithEscapingBackslash,
  serializeSegments,
  tokenEnd,
  TokenType,
} from './tokenUtils.js';

const { balancedTokens, tokens: tokenizeValue } = cssnanoUtils;

/**
 * @param {boolean} legacy
 * @param {import('postcss').AtRule} rule
 * @return {void}
 */
export default function transform(legacy, rule) {
  const ruleName = rule.name.toLowerCase();

  // We should re-arrange parameters only for `@media` and `@supports` at-rules
  if (!rule.params || !['media', 'supports'].includes(ruleName)) return;

  const source =
    rule.raws.params?.value === rule.params
      ? (rule.raws.params.raw ?? rule.params)
      : rule.params;
  const structure = balancedTokens(source);
  if (!structure) {
    if (rule.raws.params?.raw) {
      rule.raws.params = { raw: rule.params, value: rule.params };
    }
    return;
  }
  /** @type {{start:number,end:number,text:string}[]} */
  const changes = [];
  const parents = parentIndexes(structure);
  const mediaIsUnconditional =
    ruleName === 'media' && minifyMediaAll(legacy, structure, changes);
  if (mediaIsUnconditional) {
    rule.params = '';
    if (rule.raws.params?.raw) rule.raws.params = { raw: '', value: '' };
    updateAfterName(rule);
    return;
  }
  minifyWhitespace(structure, parents, changes);
  minifyAspectRatios(ruleName === 'supports', structure, parents, changes);
  const { tokens: input } = structure;
  const segmentRanges = structure
    .topLevelSegments()
    .map(({ startIndex, endIndex }) => {
      const start = input[startIndex]?.[2] ?? source.length;
      const end = endIndex > startIndex ? tokenEnd(input[endIndex - 1]) : start;
      return { start, end };
    });
  changes.sort((a, b) => a.start - b.start);
  const segments = serializeSegments(source, segmentRanges, changes);
  rule.params = [...new Set(segments)].toSorted().join();
  if (rule.raws.params?.raw) {
    rule.raws.params = { raw: rule.params, value: rule.params };
  }

  updateAfterName(rule);
}

/**
 * Strip whitespace after @media or @supports when parameters begin with (.
 *
 * @param {import('postcss').AtRule} rule
 * @return {void}
 */
function updateAfterName(rule) {
  if (!rule.params.length) {
    rule.raws.afterName = '';
  } else if (
    rule.params.startsWith('(') &&
    !endsWithEscapingBackslash(rule.name)
  ) {
    rule.raws.afterName = stripWhitespacePreservingComments(
      rule.raws.afterName
    );
  }
}

/**
 * @param {string | undefined} raw
 * @return {string}
 */
function stripWhitespacePreservingComments(raw) {
  if (!raw?.includes('/*')) return '';
  let result = '';
  for (const [type, tokenRaw] of tokenizeValue(raw)) {
    if (type !== TokenType.Whitespace) {
      result += tokenRaw;
    }
  }
  return result;
}
