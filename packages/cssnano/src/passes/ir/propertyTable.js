import data from './data/properties.json' with { type: 'json' };
import { extraAliases } from './extraConflicts.js';
import { propertyNameKey } from './propertyName.js';
import cssnanoUtils from '#utils';

const { vendorUnprefixed } = cssnanoUtils;

const ALL = 'all';

// The generated file is JSON, so its maps arrive as plain objects. Property
// names come from the stylesheet, and `constructor` or `toString` are things a
// declaration can be called, so the table is a Map.
/** @type {Map<string, {aliasOf?: string, writes?: string[], group?: string, side?: string}>} */
const entries = new Map(Object.entries(data.properties));
for (const [name, target] of extraAliases) {
  entries.set(name, { aliasOf: target });
}

/**
 * The name a known property resolves to: an alias target, or the name itself.
 *
 * @param {string} candidate
 * @return {string | undefined}
 */
function lookupProperty(candidate) {
  const entry = entries.get(candidate);
  if (entry === undefined) {
    return undefined;
  }
  return entry.aliasOf ?? candidate;
}

/**
 * Resolves a property to the base name the table knows it by. A vendor
 * prefixed spelling resolves to the property it aliases; the unprefixed
 * spelling is tried first, since webref lists some prefixed names in their own
 * right.
 *
 * @param {string} name Property name key.
 * @return {{name: string, known: boolean}}
 */
export function resolveProperty(name) {
  if (name.startsWith('-')) {
    const resolved = lookupProperty(vendorUnprefixed(name));
    if (resolved !== undefined) {
      return { name: resolved, known: true };
    }
  }
  const resolved = lookupProperty(name);
  return resolved !== undefined
    ? { name: resolved, known: true }
    : { name, known: false };
}

/**
 * The longhands a known property sets. A longhand sets only itself.
 *
 * @param {string} name
 * @return {string[]}
 */
export function longhandsOf(name) {
  return entries.get(name)?.writes ?? [name];
}

/**
 * The logical property group a longhand belongs to, and whether it is
 * flow-relative, or undefined when it is in no group.
 *
 * @param {string} longhand
 * @return {{group: string, flowRelative: boolean} | undefined}
 */
export function logicalSideOf(longhand) {
  const entry = entries.get(longhand);
  if (entry?.group === undefined) {
    return undefined;
  }
  return { group: entry.group, flowRelative: entry.side === 'flow-relative' };
}

/**
 * What a conflict query reads for one property name. Custom properties carry
 * only their key. `all` carries nothing else. A known name carries its base
 * name and each longhand with the group side it sits on and the opposite side.
 * An unknown name carries the segments a vendor extension is compared by.
 *
 * @typedef {{custom: true, key: string}
 *   | {custom: false, all: true}
 *   | {custom: false, all: false, name: string, known: boolean, subjectToAll: boolean, longhands: {name: string, side: string | undefined, opposite: string | undefined}[], lead: string, length: number, bare: string}} PropertyKeys
 */

/**
 * @param {string} group
 * @param {boolean} flowRelative
 * @return {string}
 */
const sideKey = (group, flowRelative) => `${group}:${flowRelative}`;

/**
 * The keys of one property name, as `PropertyTable#keysOf` computes them.
 *
 * @param {string} prop
 * @return {PropertyKeys}
 */
function keysOfName(prop) {
  const lowercased = propertyNameKey(prop);
  if (lowercased.startsWith('--')) return { custom: true, key: lowercased };
  if (lowercased === ALL) return { custom: false, all: true };
  const { name, known } = resolveProperty(lowercased);
  const bare = vendorUnprefixed(name);
  const segments = bare.split('-');
  return {
    custom: false,
    all: false,
    name,
    known,
    subjectToAll: lowercased !== 'direction' && lowercased !== 'unicode-bidi',
    longhands: known
      ? longhandsOf(name).map((longhand) => {
          const side = logicalSideOf(longhand);
          return {
            name: longhand,
            side: side && sideKey(side.group, side.flowRelative),
            opposite: side && sideKey(side.group, !side.flowRelative),
          };
        })
      : [],
    lead: segments[0],
    length: segments.length,
    bare,
  };
}

/**
 * The keys of each property name a conflict query has seen during one run of
 * the pass. A table belongs to the merge state of one stylesheet, so a name
 * seen in one stylesheet is not kept for the next. Custom properties are left
 * out: their keys are trivial and their names unbounded.
 */
export class PropertyTable {
  /** @type {Map<string, PropertyKeys>} */
  #keys = new Map();

  /**
   * @param {string} prop
   * @return {PropertyKeys}
   */
  keysOf(prop) {
    const cached = this.#keys.get(prop);
    if (cached) return cached;
    const keys = keysOfName(prop);
    if (!keys.custom) this.#keys.set(prop, keys);
    return keys;
  }
}
