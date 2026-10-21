import data from '../../../../src/passes/ir/data/properties.json' with { type: 'json' };
import { extraAliases } from '../../../../src/passes/ir/extraConflicts.js';
import { propertyNameKey } from '../../../../src/passes/ir/propertyName.js';
import { resolveProperty } from '../../../../src/passes/ir/propertyTable.js';
import { setsLonghands } from '../../../../src/passes/merge/lib/longhand/spec.js';
import vendorUnprefixed from '../../../../src/utils/vendorUnprefixed.js';

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
 * The name-based approximation for vendor extensions no spec describes: two
 * properties interact when they share their leading segment and their other
 * segments match in number and spelling. `place` is a wildcard leading
 * segment.
 *
 * @param {string} nameA
 * @param {string} nameB
 * @return {boolean}
 */
function conflictingSegments(nameA, nameB) {
  const a = vendorUnprefixed(nameA).split('-');
  const b = vendorUnprefixed(nameB).split('-');
  if (a[0] !== b[0] && a[0] !== 'place' && b[0] !== 'place') {
    return false;
  }
  if (a.length !== b.length) {
    return true;
  }
  return a.every((segment, index) => b[index] === segment);
}

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
  if (!a.known || !b.known) {
    return conflictingSegments(a.name, b.name);
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
