import placeMinimums from './data/placeSupport.json' with { type: 'json' };
import pairMinimums from './data/pairSupport.json' with { type: 'json' };
import featureMinimums from './data/featureSupport.json' with { type: 'json' };
import { pairFamilies } from './decl/pairForms.js';
import { longstandingFeatures } from '../../run/syntaxFeatures.js';
import {
  isUniversalBoxProperty,
  summarizeBoxProperties,
} from './boxSupportTable.js';
import {
  compareVersions,
  isDottedVersion,
  versionSeparator,
} from '#utils/versions';
import { targetsAreUnknown } from '#utils/browser-support';
/** @import {BoxProperty} from './decl/boxGroups.js' */
/** @import {PropertySupport} from './boxSupportTable.js' */

const pairMinimumsByShorthand =
  /** @type {Record<string, Record<string, string>>} */ (pairMinimums);

/**
 * @typedef {object} EngineProfile
 * @property {string | undefined} oldest - the lowest dotted version targeted
 * @property {boolean} malformed - whether a target names a version that is
 * neither dotted, a range of dotted versions, nor TP
 */

/**
 * Support only grows with the version, so a target list meets a minimum
 * exactly when the oldest target of each engine does. Summarizing the list
 * takes one pass over the targets, so a feature check costs the targets once
 * and then the number of engines.
 *
 * @param {readonly string[]} browsers - browserslist entries such as "safari 10.1"
 * @return {ReadonlyMap<string, EngineProfile>}
 */
function profileOf(browsers) {
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
  return byEngine;
}

/**
 * @param {ReadonlyMap<string, EngineProfile>} profile - the targets by engine
 * @param {Record<string, string>} minimums - first supporting version by
 * browserslist name
 * @param {boolean} [skipUnlisted] - whether an engine without a minimum is
 * assumed to reach it instead of lacking support
 * @return {boolean} whether each engine of the profile reaches its minimum
 */
function allReach(profile, minimums, skipUnlisted = false) {
  for (const [name, { oldest, malformed }] of profile) {
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
 * @param {ReadonlyMap<string, EngineProfile>} profile
 * @param {boolean} unknown - whether the targets are unknown
 * @return {boolean} whether every target supports all place-* shorthands. An
 * engine without them drops the whole declaration, losing both axes that
 * separate longhands would have kept.
 */
function placeShorthandsFrom(profile, unknown) {
  return !unknown && allReach(profile, placeMinimums);
}

/**
 * @param {ReadonlyMap<string, EngineProfile>} profile
 * @param {boolean} unknown - whether the targets are unknown
 * @param {Record<string, Record<string, string>>} minimumsByShorthand
 * @return {ReadonlySet<string>} the pair families whose shorthand every target
 * parses, and the families that need no support check
 */
function pairShorthandsFrom(profile, unknown, minimumsByShorthand) {
  return new Set(
    pairFamilies
      .filter(({ supportKey }) => {
        if (supportKey === null) return true;
        const minimums = minimumsByShorthand[supportKey] ?? {};
        return !unknown && allReach(profile, minimums);
      })
      .map(({ shorthand }) => shorthand)
  );
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
  return placeShorthandsFrom(profileOf(browsers), targetsAreUnknown(browsers));
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
  return pairShorthandsFrom(
    profileOf(browsers),
    targetsAreUnknown(browsers),
    minimumsByShorthand
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
  return featuresFrom(profileOf(browsers), targetsAreUnknown(browsers));
}

/**
 * @param {ReadonlyMap<string, EngineProfile>} profile
 * @param {boolean} unknown - whether the targets are unknown
 * @return {ReadonlySet<string>}
 */
function featuresFrom(profile, unknown) {
  /** @type {Set<string>} */
  const supported = new Set(
    !unknown && allReach(profile, longstandingFloor, true)
      ? longstandingFeatures
      : []
  );
  if (unknown) return supported;
  for (const [feature, minimums] of Object.entries(featureMinimums)) {
    if (allReach(profile, minimums)) {
      supported.add(feature);
    }
  }
  return supported;
}

/**
 * What the targets support of the box groups. The newer shorthands arrived
 * long after their longhands, so which of two declarations applies in a
 * target depends on which of them it understands. An empty list means the
 * targets are unknown, and they are judged as an engine the data does not
 * cover.
 */
export class BoxSupport {
  /** @type {boolean} */
  #unknown;
  /** @type {ReadonlyMap<string, PropertySupport>} */
  #byProperty;

  /** @param {readonly string[]} browsers */
  constructor(browsers) {
    this.#unknown = targetsAreUnknown(browsers);
    this.#byProperty = summarizeBoxProperties(browsers);
  }

  /**
   * @param {string} property
   * @return {boolean} whether every target understands the property
   */
  supportsAll(property) {
    if (this.#unknown) return isUniversalBoxProperty(property);
    return this.#byProperty.get(property)?.all ?? false;
  }

  /**
   * @param {BoxProperty} earlier
   * @param {BoxProperty} later
   * @return {boolean}
   */
  #covers(earlier, later) {
    if (earlier === later) return true;
    if (this.#unknown) return isUniversalBoxProperty(later.name);
    const mayEarlier = this.#byProperty.get(earlier.name)?.mayUnderstanding;
    const laterUnderstanding = this.#byProperty.get(later.name)?.understanding;
    if (mayEarlier === undefined || laterUnderstanding === undefined) {
      return false;
    }
    return mayEarlier.isSubsetOf(laterUnderstanding);
  }

  /**
   * @param {BoxProperty} earlier
   * @param {BoxProperty} later
   * @return {boolean} whether every target that may understand `earlier`
   * also understands `later`, so that `later` leaves nothing of `earlier`
   * showing
   */
  understandsWherever(earlier, later) {
    return this.#covers(earlier, later);
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
 * What the targets support, worked out for one merge run. The caller takes it
 * once and passes it on, so each run pays for it once.
 *
 * @param {readonly string[]} browsers - browserslist entries such as "safari 10.1"
 * @return {TargetSupport}
 */
export function targetSupportOf(browsers) {
  const unknown = targetsAreUnknown(browsers);
  const profile = profileOf(browsers);
  return {
    placeShorthands: placeShorthandsFrom(profile, unknown),
    boxSupport: new BoxSupport(browsers),
    pairShorthands: pairShorthandsFrom(
      profile,
      unknown,
      pairMinimumsByShorthand
    ),
    features: featuresFrom(profile, unknown),
  };
}
