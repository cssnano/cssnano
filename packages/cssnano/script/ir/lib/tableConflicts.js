import data from '../../../src/ir/data/properties.json' with { type: 'json' };
import { extraAliases } from '../../../src/ir/extraConflicts.js';
import { propertyNameKey } from '../../../src/ir/propertyName.js';
import { resolveProperty } from '../../../src/ir/propertyTable.js';
import { setsLonghands } from '../../../src/ir/spec.js';

const ALL = 'all';

// Built as propertyTable.js builds its own, so the writes and groups read here
// are the ones the shipped lookups see.
/** @type {Map<string, {aliasOf?: string, writes?: string[], group?: string, side?: string}>} */
const entries = new Map(Object.entries(data.properties));
for (const [name, target] of extraAliases) {
  entries.set(name, { aliasOf: target });
}

/**
 * What a known base name sets, as the longhands and the logical groups on
 * each side of them. Two names conflict through a shared longhand, or through
 * a flow-relative member of a group meeting a physical member of the same
 * group.
 *
 * @typedef {object} WriteSet
 * @property {Set<string>} longhands
 * @property {Set<string>} flowGroups
 * @property {Set<string>} physicalGroups
 */

/** @type {Map<string, WriteSet>} */
const writeSets = new Map();

/**
 * @param {string} name A base name the table knows, not an alias.
 * @return {WriteSet}
 */
function writeSetOf(name) {
  let set = writeSets.get(name);
  if (set === undefined) {
    const longhands = entries.get(name)?.writes ?? [name];
    set = {
      longhands: new Set(longhands),
      flowGroups: new Set(),
      physicalGroups: new Set(),
    };
    for (const longhand of longhands) {
      const entry = entries.get(longhand);
      if (entry?.group === undefined) continue;
      const groups =
        entry.side === 'flow-relative' ? set.flowGroups : set.physicalGroups;
      groups.add(entry.group);
    }
    writeSets.set(name, set);
  }
  return set;
}

/**
 * @param {Set<string>} a
 * @param {Set<string>} b
 * @return {boolean}
 */
function intersects(a, b) {
  for (const item of a) {
    if (b.has(item)) return true;
  }
  return false;
}

/**
 * True if two known base names can set the same physical property, per the
 * table's writes, groups and sides.
 *
 * @param {string} a
 * @param {string} b
 * @return {boolean}
 */
function writesConflict(a, b) {
  const setA = writeSetOf(a);
  const setB = writeSetOf(b);
  return (
    intersects(setA.longhands, setB.longhands) ||
    intersects(setA.flowGroups, setB.physicalGroups) ||
    intersects(setA.physicalGroups, setB.flowGroups)
  );
}

/**
 * True if two property name keys are the same property or can set one
 * another's longhands, under the table's writes.
 *
 * @param {string} nameA
 * @param {string} nameB
 * @return {boolean}
 */
function tableConflicts(nameA, nameB) {
  if (nameA === nameB) {
    return true;
  }
  // Nothing sets a custom property except itself, and their keys keep case.
  if (nameA.startsWith('--') || nameB.startsWith('--')) {
    return false;
  }
  if (nameA === ALL || nameB === ALL) {
    const other = nameA === ALL ? nameB : nameA;
    return other !== 'direction' && other !== 'unicode-bidi';
  }
  const a = resolveProperty(nameA);
  const b = resolveProperty(nameB);
  if (a.name === b.name) {
    return true;
  }
  // The data says nothing about a vendor extension, so no longhand relation can
  // clear it: any write of it conflicts.
  if (!a.known || !b.known) {
    return true;
  }
  return writesConflict(a.name, b.name);
}

/**
 * True if the family tables say two properties set a common longhand.
 *
 * @param {string} a
 * @param {string} b
 * @return {boolean}
 */
function familyConflicts(a, b) {
  if (!entries.has(propertyNameKey(a)) || !entries.has(propertyNameKey(b))) {
    return false;
  }
  const longhandsA = setsLonghands(propertyNameKey(a));
  const longhandsB = setsLonghands(propertyNameKey(b));
  for (const longhand of longhandsA) {
    if (longhandsB.has(longhand)) return true;
  }
  return false;
}

/**
 * True if declarations of two properties can set the same underlying
 * property. The shipped relation is the union of the table's writes and the
 * family tables, since a missed conflict is a bug and an extra one costs only
 * a saving.
 *
 * @param {string} a
 * @param {string} b
 * @return {boolean}
 */
export function conflicts(a, b) {
  return (
    tableConflicts(propertyNameKey(a), propertyNameKey(b)) ||
    familyConflicts(a, b)
  );
}
