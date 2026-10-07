import cssnanoUtils from 'cssnano-utils';
import stylehacks from 'stylehacks';
import { detach } from '../deferredChildEdits.js';
import { isFallback } from '../isFallback.js';
import { endsDeclarationRun } from './declarationRuns.js';
import { isAll } from './importanceLanes.js';
import { hasScientificNotation, shapeKey } from './shapeEquivalence.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ChildNode, Container, Declaration} from 'postcss' */

const { asciiLowerCase } = cssnanoUtils;

/** @typedef {Declaration | Declaration[]} Survivors */

/* Whether one fallback covers another compares what each needs, so no index
 * answers it in constant time. Keeping a few candidates per key bounds the
 * work; a cover missed beyond them only keeps a declaration. */
export const candidateLimit = 16;

/**
 * Adds a declaration to the survivors under a key, up to the limit.
 *
 * @param {Map<string, Survivors>} buckets
 * @param {string} key
 * @param {Declaration} declaration
 * @return {void}
 */
function addToBucket(buckets, key, declaration) {
  const existing = buckets.get(key);
  if (existing === undefined) {
    buckets.set(key, declaration);
  } else if (!Array.isArray(existing)) {
    buckets.set(key, [existing, declaration]);
  } else if (existing.length < candidateLimit) {
    existing.push(declaration);
  }
}

/**
 * @typedef {object} CrossPropertyRule
 * @property {(earlier: Declaration, later: Declaration) => boolean} overrides
 * whether a later declaration of another property always wins over the earlier
 * @property {(node: Declaration) => Iterable<string>} [footprint] the
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
  /** @type {Map<string, CSSToken[]> | undefined} */
  #cache;

  /**
   * @param {ReadonlySet<string>} [trustedProperties] lowercased names
   * @param {CrossPropertyRule} [crossPropertyRule]
   */
  constructor(trustedProperties, crossPropertyRule) {
    this.#trustedProperties = trustedProperties;
    this.#crossPropertyRule = crossPropertyRule;
    if (crossPropertyRule?.footprint) {
      this.#footprints = [new Map(), new Map()];
    }
  }

  /**
   * @param {Declaration} node
   * @return {boolean} whether the node was removed
   */
  visit(node) {
    if (node.prop.startsWith('--')) return false;

    const laneIndex = node.important ? 1 : 0;
    const lane = this.#lanes[laneIndex];
    const name = asciiLowerCase(node.prop);
    const survivors = lane.get(name);
    // Style hacks target specific browsers: never drop one or let one win.
    if (
      (survivors !== undefined || this.#crossPropertyRule !== undefined) &&
      stylehacks.detect(node)
    ) {
      return false;
    }
    /** @type {string | undefined} */
    let key;
    if (survivors !== undefined) {
      key = this.#keyOf(node, name);
      if (
        this.#isOverriddenByDuplicate(node, survivors, key, name, laneIndex)
      ) {
        detach(node);
        return true;
      }
    }
    if (this.#isOverriddenByOtherProperty(node, laneIndex)) {
      detach(node);
      return true;
    }
    this.#retain(node, lane, name, laneIndex, key);
    return false;
  }

  /**
   * @param {Declaration} node
   * @param {string} name - lowercased
   * @return {string | undefined} the shape key, undefined when incomparable
   */
  #keyOf(node, name) {
    if (this.#trustedProperties?.has(name)) {
      return hasScientificNotation(node.value, this.#cache) ? 'e' : '';
    }
    this.#cache ??= new Map();
    return shapeKey(node.value, name, this.#cache);
  }

  /**
   * @param {Declaration} node
   * @param {Survivors} survivors
   * @param {string | undefined} key
   * @param {string} name
   * @param {number} laneIndex
   * @return {boolean}
   */
  #isOverriddenByDuplicate(node, survivors, key, name, laneIndex) {
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
    if (!Array.isArray(bucket)) return !isFallback(node, bucket);
    for (const later of bucket) {
      if (!isFallback(node, later)) return true;
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
    for (const declaration of survivors) {
      this.#addSurvivor(buckets, declaration, name);
    }
    return buckets;
  }

  /**
   * @param {Map<string, Survivors>} buckets
   * @param {Declaration} declaration
   * @param {string} name - lowercased
   * @return {void}
   */
  #addSurvivor(buckets, declaration, name) {
    if (stylehacks.detect(declaration)) return;
    const key = this.#keyOf(declaration, name);
    if (key !== undefined) addToBucket(buckets, key, declaration);
  }

  /**
   * @param {Declaration} node
   * @param {number} laneIndex
   * @return {boolean}
   */
  #isOverriddenByOtherProperty(node, laneIndex) {
    const rule = this.#crossPropertyRule;
    if (rule === undefined) return false;
    const footprints = this.#footprints?.[laneIndex];
    const candidates = rule.footprint
      ? rule.footprint(node)
      : this.#lanes[laneIndex].keys();
    const source = footprints ?? this.#lanes[laneIndex];
    for (const property of candidates) {
      const survivors = source.get(property);
      if (survivors === undefined) continue;
      if (!Array.isArray(survivors)) {
        if (rule.overrides(node, survivors)) return true;
        continue;
      }
      for (const later of survivors) {
        if (rule.overrides(node, later)) return true;
      }
    }
    return false;
  }

  /**
   * @param {Declaration} node
   * @param {Map<string, Survivors>} lane
   * @param {string} name
   * @param {number} laneIndex
   * @param {string | undefined} key - the node's shape key, if it has one
   * @return {void}
   */
  #retain(node, lane, name, laneIndex, key) {
    addToBucket(lane, name, node);
    if (key !== undefined) {
      const buckets = this.#shapes[laneIndex].get(name);
      if (buckets !== undefined) addToBucket(buckets, key, node);
    }
    const footprints = this.#footprints?.[laneIndex];
    const footprint = this.#crossPropertyRule?.footprint;
    if (footprints === undefined || footprint === undefined) return;
    for (const property of footprint(node)) {
      addToBucket(footprints, property, node);
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
 * @param {Container} container - a style rule
 * @return {void}
 */
export function discardOverriddenDeclarations(container) {
  discardOverriddenInList(/** @type {ChildNode[]} */ (container.nodes));
}

/**
 * @param {ChildNode[]} nodes - declarations in source order, such as one
 * importance lane of a family; `all` declarations and nested rules bound runs
 * @param {ReadonlySet<string>} [trustedProperties] - lowercased names the
 * caller validated, whose duplicates need no matching shape
 * @param {CrossPropertyRule} [crossPropertyRule] - the family's precedence
 * between different properties, such as a shorthand over its longhands
 * @return {void}
 */
export function discardOverriddenInList(
  nodes,
  trustedProperties,
  crossPropertyRule
) {
  const frontier = new OverrideFrontier(trustedProperties, crossPropertyRule);
  for (let index = nodes.length - 1; index >= 0; index--) {
    const node = nodes[index];
    if (node.type !== 'decl') {
      if (endsDeclarationRun(node)) frontier.reset();
    } else if (isAll(node)) {
      /* `all` bounds the run instead of overriding what precedes it: a
       * browser without `all` ignores it and keeps the earlier declarations. */
      frontier.reset();
    } else {
      frontier.visit(node);
    }
  }
}

/**
 * @param {Declaration[][]} lanes - the normal and important lanes of a family
 * @param {ReadonlySet<string>} [trustedProperties] - forwarded
 * @param {CrossPropertyRule} [crossPropertyRule] - forwarded
 * @return {void}
 */
export function discardOverriddenInLanes(
  lanes,
  trustedProperties,
  crossPropertyRule
) {
  for (const lane of lanes) {
    discardOverriddenInList(lane, trustedProperties, crossPropertyRule);
  }
}
