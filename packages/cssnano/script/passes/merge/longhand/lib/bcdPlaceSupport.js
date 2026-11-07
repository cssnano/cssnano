/**
 * Derives, from @mdn/browser-compat-data, the first version of each browser
 * that supports every place-* shorthand, and the alignment keywords the
 * reducer may emit in one, unprefixed and unflagged. The plugin only
 * synthesizes place-* when all browserslist targets reach that version.
 */
import { serializeJson } from '../../../../../../../util/webref/webref.js';
import {
  browserslistNames,
  latestSupport,
  layoutContexts,
  layoutMode,
  standardSupportSince,
} from './bcdSupport.js';

/** @typedef {import('./bcdSupport.js').CompatData} CompatData */
/** @typedef {import('./bcdSupport.js').CompatEntry} CompatEntry */

const placeShorthands = ['place-content', 'place-items', 'place-self'];

/* Layout modes in which the longhands have long applied, so a shorthand that
 * lags behind them there would drop alignment the longhands kept. Keyword
 * subfeatures such as anchor-center are the reducer's concern. */
const layoutModes = new Set(['flex', 'grid']);

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
 * The flex and grid layout-context subfeatures of a property, by mode.
 *
 * @param {CompatEntry & Record<string, CompatEntry> | undefined} property
 * @return {IteratorObject<[string, CompatEntry]>}
 */
function boxLayoutContexts(property) {
  return layoutContexts(property).filter(([mode]) => layoutModes.has(mode));
}

/**
 * The keyword subfeatures BCD records for the alignment longhands, by
 * subfeature name. BCD is moving them from inside each layout context up to
 * the property itself, so both places are read.
 *
 * @param {CompatData} bcd
 * @return {Generator<[string, CompatEntry]>}
 */
export function* alignmentKeywordSubfeatures(bcd) {
  for (const longhand of alignmentLonghands) {
    for (const [key, entry] of Object.entries(
      bcd.css.properties[longhand] ?? {}
    )) {
      if (key === '__compat') continue;
      const mode = layoutMode(key);
      if (mode === undefined) {
        yield [key, entry];
        continue;
      }
      if (!layoutModes.has(mode)) continue;
      for (const [name, subfeature] of Object.entries(entry)) {
        if (name !== '__compat') {
          yield [name, /** @type {CompatEntry} */ (subfeature)];
        }
      }
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
  const entries = [
    ...placeShorthands.flatMap((shorthand) => {
      const property = bcd.css.properties[shorthand];
      // Only listed contexts add requirements; validatePlaceSupport rejects
      // data that lists no flex or grid context for a shorthand.
      const contexts = boxLayoutContexts(property).map(([, entry]) => entry);
      return [property, ...contexts];
    }),
    ...keywordEntries(bcd),
  ];
  /** @type {Map<string, string>} */
  const minimums = new Map();
  for (const [bcdName, browserslistName] of browserslistNames) {
    const since = latestSupport(entries, bcdName, standardSupportSince);
    if (since !== undefined) minimums.set(browserslistName, since);
  }
  return minimums;
}

/**
 * Rejects minimums derived from data whose shape the reader no longer
 * recognizes: a renamed subfeature would otherwise drop out of the gate
 * silently and let place-* reach engines that cannot parse it.
 *
 * @param {Map<string, string>} data
 * @param {CompatData} bcd
 * @return {void}
 */
export function validatePlaceSupport(data, bcd) {
  for (const engine of ['chrome', 'firefox', 'safari']) {
    if (!data.has(engine)) {
      throw new Error(`BCD lists no place-* support for ${engine}`);
    }
  }
  for (const shorthand of placeShorthands) {
    const modes = new Set(
      boxLayoutContexts(bcd.css.properties[shorthand]).map(([mode]) => mode)
    );
    for (const mode of layoutModes) {
      if (!modes.has(mode)) {
        throw new Error(`${shorthand} has no ${mode} layout context in BCD`);
      }
    }
  }
  const keywords = new Set(alignmentKeywordSubfeatures(bcd).map(([n]) => n));
  for (const keyword of requiredKeywordSubfeatures) {
    if (!keywords.has(keyword)) {
      throw new Error(`BCD lists no ${keyword} alignment keyword`);
    }
  }
}

/** @param {Map<string, string>} data @return {string} */
export function serializePlaceSupport(data) {
  const sorted = [...data].toSorted(([a], [b]) => a.localeCompare(b));
  return serializeJson(Object.fromEntries(sorted));
}
