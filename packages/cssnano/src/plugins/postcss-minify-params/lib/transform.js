import cssnanoUtils from '#utils';
import minifyMediaAll, { dropRedundantRangeFeatures } from './media.js';
import {
  minifyAspectRatios,
  minifyWhitespace,
  parentIndexes,
} from './whitespace.js';
import { serializeSegments } from './tokenUtils.js';

const { balancedTokens, tokenEnd } = cssnanoUtils;

/**
 * Minifies the prelude of an `@media` or `@supports` rule. A prelude whose
 * brackets do not balance is returned as it was written.
 *
 * @param {boolean} legacy
 * @param {'media' | 'supports'} ruleName the lowercase name of the rule
 * @param {string} source the prelude as written
 * @return {string}
 */
export default function reduceParams(legacy, ruleName, source) {
  const structure = balancedTokens(source);
  if (!structure) return source;
  /** @type {{start:number,end:number,text:string}[]} */
  const changes = [];
  const parents = parentIndexes(structure);
  // One walk over the top-level queries, shared by every pass below.
  const queries = structure.topLevelSegments();
  const mediaIsUnconditional =
    ruleName === 'media' && minifyMediaAll(legacy, structure, queries, changes);
  if (mediaIsUnconditional) return '';
  if (ruleName === 'media')
    dropRedundantRangeFeatures(structure, queries, changes);
  minifyWhitespace(structure, parents, changes);
  minifyAspectRatios(ruleName === 'supports', structure, parents, changes);
  const { tokens: input } = structure;
  const segmentRanges = queries.map(({ startIndex, endIndex }) => {
    const start = input[startIndex]?.[2] ?? source.length;
    const end = endIndex > startIndex ? tokenEnd(input[endIndex - 1]) : start;
    return { start, end };
  });
  changes.sort((a, b) => a.start - b.start);
  const segments = serializeSegments(source, segmentRanges, changes);
  return [...new Set(segments)].toSorted().join();
}
