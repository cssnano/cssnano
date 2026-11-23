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
function longhandsOf(name) {
  return entries.get(name)?.writes ?? [name];
}

/**
 * The logical property group a longhand belongs to, and whether it is
 * flow-relative, or undefined when it is in no group.
 *
 * @param {string} longhand
 * @return {{group: string, flowRelative: boolean} | undefined}
 */
function logicalSideOf(longhand) {
  const entry = entries.get(longhand);
  if (entry?.group === undefined) {
    return undefined;
  }
  return { group: entry.group, flowRelative: entry.side === 'flow-relative' };
}

/**
 * What a conflict query reads for one property name, with the id that numbers
 * the name in its run. Custom properties carry only their key. `all` carries
 * nothing else. A known name carries its base name and each longhand with the
 * group side it sits on and the opposite side. An unknown name carries no
 * longhands: it conflicts with every write but a custom one. One object serves
 * every declaration of the name, so nothing may write it.
 *
 * @typedef {Readonly<
 *   {id: number, unicodeRange: boolean, custom: true, key: string}
 *   | {id: number, unicodeRange: boolean, custom: false, all: true}
 *   | {id: number, unicodeRange: boolean, custom: false, all: false, name: string, known: boolean, subjectToAll: boolean, longhands: {name: string, side: string | undefined, opposite: string | undefined}[]}>} PropertyKeys
 */

/**
 * @param {string} group
 * @param {boolean} flowRelative
 * @return {string}
 */
const sideKey = (group, flowRelative) => `${group}:${flowRelative}`;

/**
 * The keys of one folded property name, numbered `id`.
 *
 * @param {string} lowercased the name after propertyNameKey
 * @param {number} id
 * @return {PropertyKeys}
 */
function buildKeys(lowercased, id) {
  // The tokenizer mode of a value depends only on this flag, so every shape has it.
  const unicodeRange = lowercased === 'unicode-range';
  if (lowercased.startsWith('--')) {
    return { id, unicodeRange, custom: true, key: lowercased };
  }
  if (lowercased === ALL) return { id, unicodeRange, custom: false, all: true };
  const { name, known } = resolveProperty(lowercased);
  return {
    id,
    unicodeRange,
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
  };
}

/**
 * The property names of one run, each numbered by first use. Two spellings
 * that fold to one name share its keys and id. Nothing may keep an id across
 * runs.
 */
export class PropertyNames {
  /** @type {Map<string, PropertyKeys>} the keys of each folded name */
  #keys = new Map();

  /**
   * The keys of a property name, built on its first use in the run.
   *
   * @param {string} prop
   * @return {PropertyKeys}
   */
  keysOf(prop) {
    const lowercased = propertyNameKey(prop);
    let keys = this.#keys.get(lowercased);
    if (keys === undefined) {
      keys = buildKeys(lowercased, this.#keys.size);
      this.#keys.set(lowercased, keys);
    }
    return keys;
  }
}
