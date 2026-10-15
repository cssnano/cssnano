import placeMinimums from '../data/placeSupport.json' with { type: 'json' };
import pairMinimums from '../data/pairSupport.json' with { type: 'json' };
import boxSupport from '../data/boxPropertySupport.json' with { type: 'json' };
import featureMinimums from '../data/featureSupport.json' with { type: 'json' };
import { compareVersions } from './compareVersions.js';
import { boxProperties } from './decl/boxGroups.js';
import { pairFamilies } from './decl/pairForms.js';
import { longstandingFeatures } from './syntaxFeatures.js';

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
  const [name, version] = entry.split(' ');
  const minimum = minimums[name];
  if (minimum === undefined) return false;
  if (version === 'TP') return true;
  const lowest = version.split('-')[0];
  return (
    /^\d+(?:\.\d+)*$/v.test(lowest) && compareVersions(lowest, minimum) >= 0
  );
}

/**
 * Whether every target supports all place-* shorthands. An engine without
 * them drops the whole declaration, losing both axes that separate longhands
 * would have kept.
 *
 * @param {string[]} browsers - browserslist entries such as "safari 10.1"
 * @return {boolean}
 */
export function supportsPlaceShorthands(browsers) {
  return browsers.every((entry) => reaches(entry, placeMinimums));
}

/**
 * The pair families whose shorthand every target parses, and the families
 * that need no support check. An engine without a gated shorthand drops the
 * whole declaration, losing both axes that separate longhands would have kept.
 * A gated family without minimums is taken as unsupported.
 *
 * @param {string[]} browsers - browserslist entries such as "safari 10.1"
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
        return browsers.every((entry) => reaches(entry, minimums));
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
 * @param {string} entry - a browserslist entry such as "ie 8"
 * @return {boolean}
 */
function reachesLongstandingFloor(entry) {
  return (
    !Object.hasOwn(longstandingFloor, entry.split(' ')[0]) ||
    reaches(entry, longstandingFloor)
  );
}

/**
 * The newer syntax every target parses, so an earlier declaration is no
 * fallback for it. Features without compatibility data are never included,
 * and longstanding syntax only when every target reaches the floor.
 *
 * @param {string[]} browsers - browserslist entries such as "safari 10.1"
 * @return {ReadonlySet<string>}
 */
export function featuresSupportedByAll(browsers) {
  /** @type {Set<string>} */
  const supported = new Set(
    browsers.every(reachesLongstandingFloor) ? longstandingFeatures : []
  );
  for (const [feature, minimums] of Object.entries(featureMinimums)) {
    if (browsers.every((entry) => reaches(entry, minimums))) {
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
 * The compatibility data says nothing about some engines, such as UC Browser,
 * so they may understand any property.
 *
 * @param {string} entry - a browserslist entry such as "safari 10.1"
 * @param {string} property - a property of the box groups
 * @return {boolean}
 */
function mayUnderstandBoxProperty(entry, property) {
  return (
    !coveredEngines.has(entry.split(' ')[0]) ||
    reachesBoxProperty(entry, property)
  );
}

/**
 * What the targets support of the box groups. The newer shorthands arrived
 * long after their longhands, so which of two declarations applies in a
 * target depends on which of them it understands.
 */
export class BoxSupport {
  /** @type {string[]} */
  #browsers;
  #targetCount;
  /** @type {Map<string, ReadonlySet<string>>} */
  #supporting = new Map();
  /** @type {Map<string, ReadonlySet<string>>} */
  #understanding = new Map();
  /* Answers by pair of properties, found when first asked: a rule asks about
   * the same few pairs for every side it sets. */
  #answers = new Uint8Array(boxProperties.size ** 2);

  /** @param {string[]} browsers */
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
    return this.#targetsSupporting(property).size === this.#targetCount;
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
      answer =
        earlier === later ||
        this.#targetsWhere(
          this.#understanding,
          mayUnderstandBoxProperty,
          earlier.name
        ).isSubsetOf(this.#targetsSupporting(later.name))
          ? yes
          : no;
      this.#answers[slot] = answer;
    }
    return answer === yes;
  }
}
