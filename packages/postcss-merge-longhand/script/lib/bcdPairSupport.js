/**
 * Derives, from @mdn/browser-compat-data, the first version of each browser
 * that parses a two-longhand shorthand (gap, overscroll-behavior, flex-flow)
 * wherever its longhands apply. The plugin only synthesizes the shorthand when
 * all browserslist targets reach that version, since an engine that does not
 * know it drops the declaration and with it both axes.
 */
import { serializeJson } from '../../../../util/webref/webref.js';
import { pairFamilies } from '../../src/lib/decl/pairForms.js';
import {
  browserslistNames,
  earliestVersion,
  latestSupport,
} from './bcdSupport.js';

/** @typedef {import('./bcdSupport.js').CompatData} CompatData */
/** @typedef {import('./bcdSupport.js').CompatEntry} CompatEntry */
/** @typedef {import('./bcdSupport.js').SupportStatement} SupportStatement */

/* Keywords the reducer may emit that are not among the longhands' values. */
const extraKeywords = { gap: ['normal'] };

/**
 * The gated families, which are the ones whose shorthand needs BCD data.
 *
 * @type {Record<string, { longhands: string[], keywords: string[] }>}
 */
export const pairShorthands = Object.fromEntries(
  pairFamilies
    .filter(({ supportKey }) => supportKey !== null)
    .map(({ shorthand, longhands }) => [
      shorthand,
      { longhands, keywords: extraKeywords[shorthand] ?? [] },
    ])
);

/**
 * A removed statement counts only when an unqualified statement takes over at
 * the version it was removed. Otherwise the removal leaves a gap where the
 * engine drops the shorthand, so the statement is ignored.
 *
 * @param {SupportStatement} statement
 * @param {SupportStatement[]} statements
 * @return {boolean}
 */
function parsesSinceRemoval(statement, statements) {
  return (
    !statement.version_removed ||
    statements.some(
      (later) =>
        later !== statement &&
        later.version_added === statement.version_removed &&
        !later.flags &&
        !later.prefix &&
        !later.alternative_name
    )
  );
}

/**
 * The first version that parses the feature unprefixed and unflagged. Unlike
 * a full implementation, a partial one counts: a shorthand needs only to be
 * parsed, and BCD marks as partial a missing effect on some elements. A
 * feature that is still prefixed or was removed without successor has no
 * answer.
 *
 * @param {SupportStatement | SupportStatement[]} support - newest statement first
 * @return {string | undefined}
 */
export function parsingSupportSince(support) {
  const [newest] = [support].flat();
  if (
    newest.flags ||
    newest.prefix ||
    newest.alternative_name ||
    newest.version_removed
  ) {
    return undefined;
  }
  return earliestVersion(support, parsesSinceRemoval);
}

/**
 * The records that decide whether the shorthand replaces its longhands: the
 * properties, their layout contexts (a shorthand lagging in one would drop
 * a layout the longhand styled) and the keywords the reducer may emit.
 *
 * @param {CompatData} bcd
 * @param {string} shorthand
 * @return {CompatEntry[]}
 */
function requiredEntries(bcd, shorthand) {
  const { longhands, keywords = [] } = pairShorthands[shorthand];
  return [shorthand, ...longhands].flatMap((name) => {
    const property = bcd.css.properties[name];
    if (property === undefined) return [];
    return [
      property,
      ...Object.entries(property)
        .filter(
          ([key]) =>
            key.endsWith('_context') ||
            (name === shorthand && keywords.includes(key))
        )
        .map(([, entry]) => entry),
    ];
  });
}

/**
 * @param {CompatData} bcd
 * @return {Map<string, Map<string, string>>} shorthand → browserslist name →
 * minimum version
 */
export function buildPairSupport(bcd) {
  /** @type {Map<string, Map<string, string>>} */
  const result = new Map();
  for (const shorthand of Object.keys(pairShorthands)) {
    const entries = requiredEntries(bcd, shorthand);
    /** @type {Map<string, string>} */
    const minimums = new Map();
    for (const [bcdName, browserslistName] of browserslistNames) {
      const since = latestSupport(entries, bcdName, parsingSupportSince);
      if (since !== undefined) minimums.set(browserslistName, since);
    }
    result.set(shorthand, minimums);
  }
  return result;
}

/** @param {Map<string, Map<string, string>>} data @return {void} */
export function validatePairSupport(data) {
  for (const shorthand of Object.keys(pairShorthands)) {
    for (const engine of ['chrome', 'firefox', 'safari']) {
      if (!data.get(shorthand)?.has(engine)) {
        throw new Error(`BCD lists no ${shorthand} support for ${engine}`);
      }
    }
  }
}

/** @param {Map<string, Map<string, string>>} data @return {string} */
export function serializePairSupport(data) {
  return serializeJson(
    Object.fromEntries(
      [...data].map(([shorthand, minimums]) => [
        shorthand,
        Object.fromEntries(
          [...minimums].toSorted(([a], [b]) => a.localeCompare(b))
        ),
      ])
    )
  );
}
