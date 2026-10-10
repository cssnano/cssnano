/**
 * Derives, from @mdn/browser-compat-data, the first version of each browser
 * that supports every place-* shorthand, and the alignment keywords the
 * reducer may emit in one, unprefixed and unflagged. The plugin only
 * synthesizes place-* when all browserslist targets reach that version.
 */
import { serializeJson } from '../../../../util/webref/webref.js';
import {
  browserslistNames,
  latestSupport,
  standardSupportSince,
} from './bcdSupport.js';

/** @typedef {import('./bcdSupport.js').CompatData} CompatData */
/** @typedef {import('./bcdSupport.js').CompatEntry} CompatEntry */

const placeShorthands = ['place-content', 'place-items', 'place-self'];

/* Layout modes in which the longhands have long applied, so a shorthand that
 * lags behind them there would drop alignment the longhands kept. Keyword
 * subfeatures such as anchor-center are the reducer's concern. */
const layoutContexts = ['flex_context', 'grid_context'];

const alignmentLonghands = [
  'align-content',
  'justify-content',
  'align-items',
  'justify-items',
  'align-self',
  'justify-self',
];

/**
 * A place-* shorthand is dropped whole for one keyword the engine cannot
 * parse, so keywords the reducer treats as widely supported must parse
 * wherever the shorthand does. BCD names these subfeatures after the keyword,
 * with underscores for spaces. Subfeatures such as `start_end` describe flex
 * layout behavior, not parsing, and are deliberately left out.
 */
const requiredKeywordSubfeatures = new Set(['space-evenly', 'first_baseline']);

/**
 * The keyword subfeatures BCD records for the alignment longhands in each
 * layout context, by subfeature name.
 *
 * @param {CompatData} bcd
 * @return {Generator<[string, CompatEntry]>}
 */
export function* alignmentKeywordSubfeatures(bcd) {
  for (const longhand of alignmentLonghands) {
    for (const context of layoutContexts) {
      yield* Object.entries(bcd.css.properties[longhand]?.[context] ?? {});
    }
  }
}

/**
 * @param {CompatData} bcd
 * @return {CompatEntry[]}
 */
function keywordEntries(bcd) {
  return alignmentKeywordSubfeatures(bcd)
    .filter(([name]) => requiredKeywordSubfeatures.has(name))
    .map(([, entry]) => entry)
    .toArray();
}

/**
 * @param {CompatData} bcd
 * @return {Map<string, string>} browserslist name → minimum version
 */
export function buildPlaceSupport(bcd) {
  /** @type {Map<string, string>} */
  const minimums = new Map();
  for (const [bcdName, browserslistName] of browserslistNames) {
    const entries = [
      ...placeShorthands.flatMap((shorthand) => {
        const property = bcd.css.properties[shorthand];
        // A context BCD does not list adds no requirement of its own.
        const contexts = layoutContexts.map((context) => property?.[context]);
        return [property, ...contexts.filter((entry) => entry !== undefined)];
      }),
      ...keywordEntries(bcd),
    ];
    const since = latestSupport(entries, bcdName, standardSupportSince);
    if (since !== undefined) minimums.set(browserslistName, since);
  }
  return minimums;
}

/** @param {Map<string, string>} data @return {void} */
export function validatePlaceSupport(data) {
  for (const engine of ['chrome', 'firefox', 'safari']) {
    if (!data.has(engine)) {
      throw new Error(`BCD lists no place-* support for ${engine}`);
    }
  }
}

/** @param {Map<string, string>} data @return {string} */
export function serializePlaceSupport(data) {
  const sorted = [...data].toSorted(([a], [b]) => a.localeCompare(b));
  return serializeJson(Object.fromEntries(sorted));
}
