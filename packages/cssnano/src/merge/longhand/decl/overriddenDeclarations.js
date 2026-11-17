import cssnanoUtils from '#utils';
import { hasHack } from '#stylehacks';
import { isFallback } from '../isFallback.js';
import { RUN_END } from '../blockDeclarations.js';
import { isAll } from './importanceLanes.js';
import {
  hasScientificNotation,
  mayHaveExponent,
  shapeKey,
} from './shapeEquivalence.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {BlockDeclarations, DeclarationItem} from '../blockDeclarations.js' */

const { asciiLowerCase } = cssnanoUtils;

/** @typedef {number | number[]} Survivors positions in the list */

/* Whether one fallback covers another compares what each needs, so no index
 * answers it in constant time. Keeping a few candidates per key bounds the
 * work; a cover missed beyond them only keeps a declaration. */
export const candidateLimit = 16;

/**
 * Adds a declaration to the survivors under a key, up to the limit.
 *
 * @param {Map<string, Survivors>} buckets
 * @param {string} key
 * @param {number} position
 * @return {void}
 */
function addToBucket(buckets, key, position) {
  const existing = buckets.get(key);
  if (existing === undefined) {
    buckets.set(key, position);
  } else if (!Array.isArray(existing)) {
    buckets.set(key, [existing, position]);
  } else if (existing.length < candidateLimit) {
    existing.push(position);
  }
}

/**
 * @typedef {object} CrossPropertyRule
 * @property {(earlier: DeclarationItem, later: DeclarationItem, features: ReadonlySet<string>) => boolean} overrides
 * whether a later declaration of another property always wins over the earlier
 * @property {(node: DeclarationItem) => Iterable<string>} [footprint] the
 * lowercased properties a declaration sets; with it, only later declarations
 * whose footprint holds a property the earlier one sets are compared
 */

/**
 * Visits declarations from last to first, tracking per importance lane the
 * later declarations that survive. A later declaration of the same property
 * and importance always wins, so the earlier can never be its fallback.
 * Survivors are grouped by value shape, so a value is compared only with
 * survivors of the same shape.
 */
class OverrideFrontier {
  /** @type {ReadonlySet<string> | undefined} */
  #trustedProperties;
  /** @type {CrossPropertyRule | undefined} */
  #crossPropertyRule;
  /** @type {[Map<string, Survivors>, Map<string, Survivors>]} */
  #lanes = [new Map(), new Map()];
  /**
   * Survivors of each repeated property, by shape key. Style hacks are left
   * out: they never win.
   *
   * @type {[Map<string, Map<string, Survivors>>, Map<string, Map<string, Survivors>>]}
   */
  #shapes = [new Map(), new Map()];
  /** @type {[Map<string, Survivors>, Map<string, Survivors>] | undefined} */
  #footprints;
  /** @type {BlockDeclarations} */
  #list;
  /** @type {ReadonlySet<string>} */
  #features;

  /**
   * @param {BlockDeclarations} list
   * @param {ReadonlySet<string>} features the features every target supports
   * @param {ReadonlySet<string>} [trustedProperties] lowercased names
   * @param {CrossPropertyRule} [crossPropertyRule]
   */
  constructor(list, features, trustedProperties, crossPropertyRule) {
    this.#list = list;
    this.#features = features;
    this.#trustedProperties = trustedProperties;
    this.#crossPropertyRule = crossPropertyRule;
    if (crossPropertyRule?.footprint) {
      this.#footprints = [new Map(), new Map()];
    }
  }

  /**
   * @param {number} position
   * @return {boolean} whether the declaration was removed
   */
  visit(position) {
    const node = this.#list.at(position);
    if (node.prop.startsWith('--')) return false;

    const laneIndex = node.important ? 1 : 0;
    const lane = this.#lanes[laneIndex];
    const name = asciiLowerCase(node.prop);
    const survivors = lane.get(name);
    // Style hacks target specific browsers: never drop one or let one win.
    if (
      (survivors !== undefined || this.#crossPropertyRule !== undefined) &&
      hasHack(node.before, node.prop, node.value)
    ) {
      return false;
    }
    /** @type {string | undefined} */
    let key;
    if (survivors !== undefined) {
      key = this.#keyOf(node, name);
      if (
        this.#isOverriddenByDuplicate(position, survivors, key, name, laneIndex)
      ) {
        this.#list.remove(position);
        return true;
      }
    }
    if (this.#isOverriddenByOtherProperty(position, laneIndex)) {
      this.#list.remove(position);
      return true;
    }
    this.#retain(position, lane, name, laneIndex, key);
    return false;
  }

  /**
   * @param {DeclarationItem} node
   * @param {string} name - lowercased
   * @return {string | undefined} the shape key, undefined when incomparable
   */
  #keyOf(node, name) {
    if (this.#trustedProperties?.has(name)) {
      return mayHaveExponent(node.value) && hasScientificNotation(node.tokens)
        ? 'e'
        : '';
    }
    return shapeKey(node.tokens, name);
  }

  /**
   * @param {number} position
   * @param {Survivors} survivors
   * @param {string | undefined} key
   * @param {string} name
   * @param {number} laneIndex
   * @return {boolean}
   */
  #isOverriddenByDuplicate(position, survivors, key, name, laneIndex) {
    // An incomparable value is equal to nothing, not even itself.
    if (key === undefined) return false;
    const shapes = this.#shapes[laneIndex];
    let buckets = shapes.get(name);
    if (buckets === undefined) {
      buckets = this.#bucketBy(survivors, name);
      shapes.set(name, buckets);
    }
    const bucket = buckets.get(key);
    if (bucket === undefined) return false;
    const node = this.#list.at(position);
    if (!Array.isArray(bucket)) {
      return !isFallback(node, this.#list.at(bucket), this.#features);
    }
    for (const later of bucket) {
      if (!isFallback(node, this.#list.at(later), this.#features)) return true;
    }
    return false;
  }

  /**
   * Groups the survivors of a property that repeats, so later declarations
   * are compared only with survivors of their own shape.
   *
   * @param {Survivors} survivors
   * @param {string} name - lowercased
   * @return {Map<string, Survivors>}
   */
  #bucketBy(survivors, name) {
    /** @type {Map<string, Survivors>} */
    const buckets = new Map();
    if (!Array.isArray(survivors)) {
      this.#addSurvivor(buckets, survivors, name);
      return buckets;
    }
    for (const position of survivors) {
      this.#addSurvivor(buckets, position, name);
    }
    return buckets;
  }

  /**
   * @param {Map<string, Survivors>} buckets
   * @param {number} position
   * @param {string} name - lowercased
   * @return {void}
   */
  #addSurvivor(buckets, position, name) {
    const declaration = this.#list.at(position);
    if (hasHack(declaration.before, declaration.prop, declaration.value))
      return;
    const key = this.#keyOf(declaration, name);
    if (key !== undefined) addToBucket(buckets, key, position);
  }

  /**
   * @param {number} position
   * @param {number} laneIndex
   * @return {boolean}
   */
  #isOverriddenByOtherProperty(position, laneIndex) {
    const rule = this.#crossPropertyRule;
    if (rule === undefined) return false;
    const node = this.#list.at(position);
    const footprints = this.#footprints?.[laneIndex];
    const candidates = rule.footprint
      ? rule.footprint(node)
      : this.#lanes[laneIndex].keys();
    const source = footprints ?? this.#lanes[laneIndex];
    for (const property of candidates) {
      const survivors = source.get(property);
      if (survivors === undefined) continue;
      if (!Array.isArray(survivors)) {
        if (rule.overrides(node, this.#list.at(survivors), this.#features))
          return true;
        continue;
      }
      for (const later of survivors) {
        if (rule.overrides(node, this.#list.at(later), this.#features))
          return true;
      }
    }
    return false;
  }

  /**
   * @param {number} position
   * @param {Map<string, Survivors>} lane
   * @param {string} name
   * @param {number} laneIndex
   * @param {string | undefined} key - the node's shape key, if it has one
   * @return {void}
   */
  #retain(position, lane, name, laneIndex, key) {
    addToBucket(lane, name, position);
    if (key !== undefined) {
      const buckets = this.#shapes[laneIndex].get(name);
      if (buckets !== undefined) addToBucket(buckets, key, position);
    }
    const footprints = this.#footprints?.[laneIndex];
    const footprint = this.#crossPropertyRule?.footprint;
    if (footprints === undefined || footprint === undefined) return;
    for (const property of footprint(this.#list.at(position))) {
      addToBucket(footprints, property, position);
    }
  }

  /** Starts a new run: nothing before this point is overridden by what follows. */
  reset() {
    this.#lanes[0].clear();
    this.#lanes[1].clear();
    this.#shapes[0].clear();
    this.#shapes[1].clear();
    this.#footprints?.[0].clear();
    this.#footprints?.[1].clear();
  }
}

/**
 * @param {BlockDeclarations} list
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {void}
 */
export function discardOverriddenDeclarations(list, features) {
  discardOverriddenInList(list, list.chain, features);
}

/**
 * @param {BlockDeclarations} list
 * @param {readonly number[]} positions - declarations in source order, such as
 * one importance lane of a family; `all` declarations, nested rules and values
 * kept as written bound runs, so `RUN_END` marks a run end in a chain
 * @param {ReadonlySet<string>} features the features every target supports
 * @param {ReadonlySet<string>} [trustedProperties] - lowercased names the
 * caller validated, whose duplicates need no matching shape
 * @param {CrossPropertyRule} [crossPropertyRule] - the family's precedence
 * between different properties, such as a shorthand over its longhands
 * @return {void}
 */
export function discardOverriddenInList(
  list,
  positions,
  features,
  trustedProperties,
  crossPropertyRule
) {
  const frontier = new OverrideFrontier(
    list,
    features,
    trustedProperties,
    crossPropertyRule
  );
  for (let index = positions.length - 1; index >= 0; index--) {
    const position = positions[index];
    if (position === RUN_END) {
      frontier.reset();
      continue;
    }
    const node = list.at(position);
    /* `all` bounds the run instead of overriding what precedes it: a
     * browser without `all` ignores it and keeps the earlier declarations.
     * A value kept as written is never removed, so it only bounds the run. */
    if (isAll(node) || node.kept) {
      frontier.reset();
    } else {
      frontier.visit(position);
    }
  }
}

/**
 * @param {BlockDeclarations} list
 * @param {readonly (readonly number[])[]} lanes - the normal and important lanes of a family
 * @param {ReadonlySet<string>} features - forwarded
 * @param {ReadonlySet<string>} [trustedProperties] - forwarded
 * @param {CrossPropertyRule} [crossPropertyRule] - forwarded
 * @return {void}
 */
export function discardOverriddenInLanes(
  list,
  lanes,
  features,
  trustedProperties,
  crossPropertyRule
) {
  for (const lane of lanes) {
    discardOverriddenInList(
      list,
      lane,
      features,
      trustedProperties,
      crossPropertyRule
    );
  }
}
