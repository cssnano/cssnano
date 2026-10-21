import placeMinimums from './data/placeSupport.json' with { type: 'json' };
import pairMinimums from './data/pairSupport.json' with { type: 'json' };
import boxSupport from './data/boxPropertySupport.json' with { type: 'json' };
import featureMinimums from './data/featureSupport.json' with { type: 'json' };
import { boxProperties } from './decl/boxGroups.js';
import { pairFamilies } from './decl/pairForms.js';
import { longstandingFeatures } from './syntaxFeatures.js';
import {
  browserName,
  compareVersions,
  isDottedVersion,
  versionSeparator,
} from '#utils/versions';
import { targetsAreUnknown } from '#utils/browser-support';

const pairMinimumsByShorthand =
  /** @type {Record<string, Record<string, string>>} */ (pairMinimums);

/**
 * @param {string} entry - a browserslist entry such as "safari 10.1"
 * @param {Record<string, string>} minimums - first supporting version by
 * browserslist name
 * @return {boolean} whether the target reaches its engine's minimum; a target
 * without compatibility data counts as lacking support
 */
function reaches(entry, minimums) {
  const separator = versionSeparator(entry);
  const version = entry.slice(separator + 1);
  const minimum = minimums[entry.slice(0, separator)];
  if (minimum === undefined) return false;
  if (version === 'TP') return true;
  const lowest = version.split('-')[0];
  return isDottedVersion(lowest) && compareVersions(lowest, minimum) >= 0;
}

/**
 * @typedef {object} EngineProfile
 * @property {string | undefined} oldest - the lowest dotted version targeted
 * @property {boolean} malformed - whether a target names a version that is
 * neither dotted, a range of dotted versions, nor TP
 */

/**
 * Support only grows with the version, so a target list meets a minimum
 * exactly when the oldest target of each engine does. Summarizing the list
 * once makes each feature check cost the number of engines, not of targets.
 *
 * @type {WeakMap<readonly string[], ReadonlyMap<string, EngineProfile>>}
 */
const profiles = new WeakMap();

/**
 * @param {readonly string[]} browsers - browserslist entries such as "safari 10.1"
 * @return {ReadonlyMap<string, EngineProfile>}
 */
function profileOf(browsers) {
  let profile = profiles.get(browsers);
  if (profile !== undefined) return profile;
  /** @type {Map<string, EngineProfile>} */
  const byEngine = new Map();
  for (const entry of browsers) {
    const separator = versionSeparator(entry);
    const name = entry.slice(0, separator);
    const version = entry.slice(separator + 1);
    let engine = byEngine.get(name);
    if (engine === undefined) {
      engine = { oldest: undefined, malformed: false };
      byEngine.set(name, engine);
    }
    if (version === 'TP') continue;
    const lowest = version.split('-')[0];
    if (!isDottedVersion(lowest)) {
      engine.malformed = true;
    } else if (
      engine.oldest === undefined ||
      compareVersions(lowest, engine.oldest) < 0
    ) {
      engine.oldest = lowest;
    }
  }
  profile = byEngine;
  profiles.set(browsers, profile);
  return profile;
}

/**
 * @param {readonly string[]} browsers - browserslist entries such as "safari 10.1"
 * @param {Record<string, string>} minimums - first supporting version by
 * browserslist name
 * @param {boolean} [skipUnlisted] - whether an engine without a minimum is
 * assumed to reach it instead of lacking support
 * @return {boolean} whether there are targets and each reaches its minimum
 */
function allReach(browsers, minimums, skipUnlisted = false) {
  if (targetsAreUnknown(browsers)) return false;
  for (const [name, { oldest, malformed }] of profileOf(browsers)) {
    const minimum = Object.hasOwn(minimums, name) ? minimums[name] : undefined;
    if (minimum === undefined) {
      if (skipUnlisted) continue;
      return false;
    }
    if (malformed) return false;
    if (oldest !== undefined && compareVersions(oldest, minimum) < 0) {
      return false;
    }
  }
  return true;
}

/**
 * Whether every target supports all place-* shorthands. An engine without
 * them drops the whole declaration, losing both axes that separate longhands
 * would have kept.
 *
 * @param {readonly string[]} browsers - browserslist entries such as "safari 10.1"
 * @return {boolean}
 */
export function supportsPlaceShorthands(browsers) {
  return allReach(browsers, placeMinimums);
}

/**
 * The pair families whose shorthand every target parses, and the families
 * that need no support check. An engine without a gated shorthand drops the
 * whole declaration, losing both axes that separate longhands would have kept.
 * A gated family without minimums is taken as unsupported.
 *
 * @param {readonly string[]} browsers - browserslist entries such as "safari 10.1"
 * @param {Record<string, Record<string, string>>} [minimumsByShorthand] - first
 * supporting version by shorthand and browserslist name
 * @return {ReadonlySet<string>} the shorthand names
 */
export function supportedPairShorthands(
  browsers,
  minimumsByShorthand = pairMinimumsByShorthand
) {
  return new Set(
    pairFamilies
      .filter(({ supportKey }) => {
        if (supportKey === null) return true;
        const minimums = minimumsByShorthand[supportKey] ?? {};
        return allReach(browsers, minimums);
      })
      .map(({ shorthand }) => shorthand)
  );
}

/**
 * The oldest release of each engine that parses every longstanding unit and
 * function `isFallback` lists, by browserslist name. An engine left out, such
 * as Opera Mini, is assumed to reach it; its gaps are tracked as features.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const longstandingFloor = {
  android: '4.4.3',
  chrome: '49',
  edge: '12',
  firefox: '52',
  ie: '11',
  ios_saf: '9',
  op_mob: '36',
  opera: '36',
  safari: '9',
  samsung: '4',
};

/**
 * The newer syntax every target parses, so an earlier declaration is no
 * fallback for it. Features without compatibility data are never included,
 * and longstanding syntax only when every target reaches the floor.
 *
 * @param {readonly string[]} browsers - browserslist entries such as "safari 10.1"
 * @return {ReadonlySet<string>}
 */
export function featuresSupportedByAll(browsers) {
  /** @type {Set<string>} */
  const supported = new Set(
    allReach(browsers, longstandingFloor, true) ? longstandingFeatures : []
  );
  for (const [feature, minimums] of Object.entries(featureMinimums)) {
    if (allReach(browsers, minimums)) {
      supported.add(feature);
    }
  }
  return supported;
}

/** @import {BoxProperty} from './decl/boxGroups.js' */

const unknown = 0;
const no = 1;
const yes = 2;

const boxMinimums =
  /** @type {Record<string, string | Record<string, string>>} */ (
    boxSupport.properties
  );
const coveredEngines = new Set(boxSupport.engines);

/**
 * @param {string} entry - a browserslist entry such as "safari 10.1"
 * @param {string} property - a property of the box groups
 * @return {boolean}
 */
function reachesBoxProperty(entry, property) {
  const minimums = boxMinimums[property];
  if (minimums === undefined) return false;
  return typeof minimums === 'string' || reaches(entry, minimums);
}

/**
 * Whether every engine parses the property, as for the CSS 1 and CSS 2 box
 * properties. Only these are safe for targets that are unknown.
 *
 * @param {string} property - a property of the box groups
 * @return {boolean}
 */
function isUniversalBoxProperty(property) {
  return typeof boxMinimums[property] === 'string';
}

/**
 * The compatibility data says nothing about some engines, such as UC Browser,
 * so they may understand any property. This answers "may this browser parse
 * it?" to keep a fallback, which is safer to assume than to deny, unlike the
 * shared feature checks in utils/browserSupport.js.
 *
 * @param {string} entry - a browserslist entry such as "safari 10.1"
 * @param {string} property - a property of the box groups
 * @return {boolean}
 */
function mayUnderstandBoxProperty(entry, property) {
  return (
    !coveredEngines.has(browserName(entry)) ||
    reachesBoxProperty(entry, property)
  );
}

/**
 * What the targets support of the box groups. The newer shorthands arrived
 * long after their longhands, so which of two declarations applies in a
 * target depends on which of them it understands. An empty list means the
 * targets are unknown, and they are judged as an engine the data does not
 * cover.
 */
export class BoxSupport {
  /** @type {readonly string[]} */
  #browsers;
  #targetCount;
  /** @type {Map<string, ReadonlySet<string>>} */
  #supporting = new Map();
  /** @type {Map<string, ReadonlySet<string>>} */
  #understanding = new Map();
  /* Answers by pair of properties, found when first asked: a rule asks about
   * the same few pairs for every side it sets. */
  #answers = new Uint8Array(boxProperties.size ** 2);

  /** @param {readonly string[]} browsers */
  constructor(browsers) {
    this.#browsers = browsers;
    this.#targetCount = new Set(browsers).size;
  }

  /**
   * @param {Map<string, ReadonlySet<string>>} cache
   * @param {(entry: string, property: string) => boolean} test
   * @param {string} property
   * @return {ReadonlySet<string>}
   */
  #targetsWhere(cache, test, property) {
    let targets = cache.get(property);
    if (targets === undefined) {
      targets = new Set(
        this.#browsers.filter((entry) => test(entry, property))
      );
      cache.set(property, targets);
    }
    return targets;
  }

  /** @param {string} property */
  #targetsSupporting(property) {
    return this.#targetsWhere(this.#supporting, reachesBoxProperty, property);
  }

  /**
   * @param {string} property
   * @return {boolean} whether every target understands the property
   */
  supportsAll(property) {
    if (targetsAreUnknown(this.#browsers))
      return isUniversalBoxProperty(property);
    return this.#targetsSupporting(property).size === this.#targetCount;
  }

  /**
   * @param {BoxProperty} earlier
   * @param {BoxProperty} later
   * @return {boolean}
   */
  #covers(earlier, later) {
    if (earlier === later) return true;
    if (targetsAreUnknown(this.#browsers))
      return isUniversalBoxProperty(later.name);
    return this.#targetsWhere(
      this.#understanding,
      mayUnderstandBoxProperty,
      earlier.name
    ).isSubsetOf(this.#targetsSupporting(later.name));
  }

  /**
   * @param {BoxProperty} earlier
   * @param {BoxProperty} later
   * @return {boolean} whether every target that may understand `earlier`
   * also understands `later`, so that `later` leaves nothing of `earlier`
   * showing
   */
  understandsWherever(earlier, later) {
    const slot = earlier.index * boxProperties.size + later.index;
    let answer = this.#answers[slot];
    if (answer === unknown) {
      answer = this.#covers(earlier, later) ? yes : no;
      this.#answers[slot] = answer;
    }
    return answer === yes;
  }
}

/**
 * @typedef {object} TargetSupport
 * @property {boolean} placeShorthands
 * @property {BoxSupport} boxSupport
 * @property {ReadonlySet<string>} pairShorthands
 * @property {ReadonlySet<string>} features
 */

/**
 * Targets are shared by every file of a build, so what they support is worked
 * out once per list rather than once per file.
 *
 * @type {WeakMap<readonly string[], TargetSupport>}
 */
const supportByTargets = new WeakMap();

/**
 * @param {readonly string[]} browsers - browserslist entries such as "safari 10.1"
 * @return {TargetSupport}
 */
export function targetSupportOf(browsers) {
  let support = supportByTargets.get(browsers);
  if (support === undefined) {
    support = {
      placeShorthands: supportsPlaceShorthands(browsers),
      boxSupport: new BoxSupport(browsers),
      pairShorthands: supportedPairShorthands(browsers),
      features: featuresSupportedByAll(browsers),
    };
    supportByTargets.set(browsers, support);
  }
  return support;
}
