import {
  isFlowRelative,
  serializeJson,
  sortedByName,
} from '../../../../../../util/webref/webref.js';

/**
 * Derives the property relations postcss-merge-rules needs from the raw
 * `@webref/css` property list.
 *
 * @typedef {object} WebrefProperty
 * @property {string} name
 * @property {string} [legacyAliasOf] Vendor prefixed spelling of another
 * property, e.g. `-webkit-transform`.
 * @property {string[]} [longhands] Properties the shorthand expands to.
 * @property {string[]} [resetLonghands] Properties the shorthand resets
 * without being able to set, e.g. `border` resetting `border-image`.
 * @property {string} [logicalPropertyGroup] Name of the group whose members
 * map onto the same physical properties, e.g. `margin`.
 *
 * @typedef {object} PropertyGroups
 * @property {string[]} properties Every property name webref knows about.
 * @property {Map<string, string>} aliases Prefixed spelling to canonical
 * property.
 * @property {Map<string, string[]>} shorthands Shorthand to the longhands it
 * sets, expanded transitively.
 * @property {Map<string, string>} logicalGroups Property to the name of its
 * logical property group.
 * @property {string[]} flowRelative The flow-relative members of those groups;
 * the remaining members are physical.
 */

/**
 * @param {WebrefProperty[]} properties
 * @return {PropertyGroups}
 */
export function buildPropertyGroups(properties) {
  const byName = new Map(
    properties.map((property) => [property.name, property])
  );

  /** @type {Map<string, string>} */
  const aliases = new Map();
  for (const property of properties) {
    if (property.legacyAliasOf) {
      aliases.set(property.name, property.legacyAliasOf);
    }
  }
  /** @param {string} name */
  const canonical = (name) => aliases.get(name) ?? name;

  /** @type {Map<string, Set<string>>} */
  const expanded = new Map();
  /** @type {Set<string>} */
  const expanding = new Set();
  /**
   * The longhands a property ultimately sets. A longhand sets only itself.
   *
   * @param {string} name
   * @return {Set<string>}
   */
  function longhandsOf(name) {
    const target = canonical(name);
    const cached = expanded.get(target);
    if (cached) {
      return cached;
    }
    if (expanding.has(target)) {
      throw new Error(`Cyclic shorthand definition for ${target}`);
    }
    expanding.add(target);
    const definition = byName.get(target);
    const parts = [
      ...(definition?.longhands ?? []),
      ...(definition?.resetLonghands ?? []),
    ];
    /** @type {Set<string>} */
    const longhands = new Set();
    if (parts.length === 0) {
      longhands.add(target);
    } else {
      for (const part of parts) {
        for (const longhand of longhandsOf(part)) {
          longhands.add(longhand);
        }
      }
    }
    expanding.delete(target);
    expanded.set(target, longhands);
    return longhands;
  }

  /** @type {Map<string, string[]>} */
  const shorthands = new Map();
  /** @type {Map<string, string>} */
  const logicalGroups = new Map();
  /** @type {string[]} */
  const flowRelative = [];
  /** @type {string[]} */
  const names = [];

  for (const { name, logicalPropertyGroup } of properties) {
    // `--*` stands in for custom properties as a whole, which the plugin
    // handles separately; it never appears as a property name in a stylesheet.
    if (name === '--*') {
      continue;
    }
    names.push(name);
    const longhands = [...longhandsOf(name)].toSorted();
    if (longhands.length > 1 || longhands[0] !== canonical(name)) {
      shorthands.set(name, longhands);
    }
    if (logicalPropertyGroup) {
      logicalGroups.set(name, logicalPropertyGroup);
      if (isFlowRelative(name)) {
        flowRelative.push(name);
      }
    }
  }

  return {
    properties: names.toSorted(),
    aliases: sortEntries(aliases),
    shorthands: sortEntries(shorthands),
    logicalGroups: sortEntries(logicalGroups),
    flowRelative: flowRelative.toSorted(),
  };
}

/**
 * Keeps the generated file stable across webref releases that only reshuffle
 * the order properties are listed in.
 *
 * @template T
 * @param {Map<string, T>} map
 * @return {Map<string, T>}
 */
function sortEntries(map) {
  return new Map(sortedByName(map));
}

/**
 * Guards against publishing data that a webref release has silently removed:
 * every relation the plugin relies on has to still be there, and every logical
 * property group has to hold as many physical members as flow-relative ones,
 * otherwise `isFlowRelative` has stopped matching webref's naming.
 *
 * @param {PropertyGroups} data
 * @return {void}
 */
export function validate(data) {
  const { properties, aliases, shorthands, logicalGroups, flowRelative } = data;
  const known = new Set(properties);
  const flow = new Set(flowRelative);

  if (properties.length < 500) {
    throw new Error(
      `Expected at least 500 properties, got ${properties.length}`
    );
  }
  for (const [alias, target] of aliases) {
    if (!known.has(target)) {
      throw new Error(`Alias ${alias} points at unknown property ${target}`);
    }
    if (aliases.has(target)) {
      throw new Error(`Alias ${alias} points at another alias, ${target}`);
    }
  }
  for (const [shorthand, longhands] of shorthands) {
    for (const longhand of longhands) {
      if (shorthands.has(longhand)) {
        throw new Error(
          `${shorthand} expands to ${longhand}, itself a shorthand`
        );
      }
    }
  }
  /** @type {Map<string, {physical: number, flow: number}>} */
  const groups = new Map();
  for (const [name, group] of logicalGroups) {
    const counts = groups.get(group) ?? { physical: 0, flow: 0 };
    counts[flow.has(name) ? 'flow' : 'physical']++;
    groups.set(group, counts);
  }
  for (const [group, counts] of groups) {
    if (counts.physical !== counts.flow || counts.physical === 0) {
      throw new Error(
        `Logical property group ${group} is split ${counts.physical} physical / ${counts.flow} flow-relative`
      );
    }
  }
  // Spot checks for relations the plugin's own tests depend on. Keep this in
  // sync with the `cases` in test/passes/ir/propertyRelations.test.js: this
  // catches a future webref release dropping a relation, that catches a
  // regression in how propertyRelations.js consumes the data.
  for (const [shorthand, longhand] of [
    ['font', 'line-height'],
    ['border', 'border-top-color'],
    ['place-content', 'align-content'],
    ['gap', 'row-gap'],
    ['inset', 'top'],
  ]) {
    if (!shorthands.get(shorthand)?.includes(longhand)) {
      throw new Error(`Expected ${shorthand} to set ${longhand}`);
    }
  }
  if (aliases.get('-webkit-background-clip') !== 'background-clip') {
    throw new Error(
      'Expected -webkit-background-clip to alias background-clip'
    );
  }
}

/**
 * One entry of the pass IR's property table. An entry is an alias, a
 * shorthand with the longhands it writes, or a longhand; a longhand in a
 * logical property group also names its group and side.
 *
 * @typedef {object} PropertyEntry
 * @property {string} [aliasOf]
 * @property {string[]} [writes] Sorted longhands, including resets.
 * @property {string} [group]
 * @property {'physical' | 'flow-relative'} [side]
 */

/**
 * Derives the pass IR's property table from the raw `@webref/css` list. The
 * entries are keyed by name and sorted, so a data refresh shows a reviewable
 * diff.
 *
 * @param {WebrefProperty[]} properties
 * @return {Record<string, PropertyEntry>}
 */
export function buildProperties(properties) {
  const groups = buildPropertyGroups(properties);
  const flow = new Set(groups.flowRelative);
  /** @type {Record<string, PropertyEntry>} */
  const entries = {};
  for (const name of groups.properties) {
    /** @type {PropertyEntry} */
    const entry = {};
    const aliasOf = groups.aliases.get(name);
    if (aliasOf !== undefined) {
      entry.aliasOf = aliasOf;
    } else if (groups.shorthands.has(name)) {
      entry.writes = groups.shorthands.get(name);
    }
    const group = groups.logicalGroups.get(name);
    if (group !== undefined) {
      entry.group = group;
      entry.side = flow.has(name) ? 'flow-relative' : 'physical';
    }
    entries[name] = entry;
  }
  return entries;
}

/**
 * Refuses to publish a property table that the pass cannot rely on. The
 * family tables are checked against `writes`, so the union relation keeps every
 * conflict they claim: a data refresh that drops one fails here, not on a page.
 *
 * @param {Record<string, PropertyEntry>} entries
 * @param {{ shorthands: string[], setsLonghands: (name: string) => Set<string> }} family
 * @return {void}
 */
export function validateProperties(entries, family) {
  validateReferences(entries);
  validateGroupSides(entries);
  validateFamilyWrites(entries, family);
}

/**
 * Every alias and every written longhand has an entry of its own, and an alias
 * does not point at another alias.
 *
 * @param {Record<string, PropertyEntry>} entries
 * @return {void}
 */
function validateReferences(entries) {
  for (const [name, entry] of Object.entries(entries)) {
    if (entry.aliasOf !== undefined) {
      if (!Object.hasOwn(entries, entry.aliasOf)) {
        throw new Error(`${name} aliases unknown property ${entry.aliasOf}`);
      }
      if (entries[entry.aliasOf].aliasOf !== undefined) {
        throw new Error(`${name} aliases another alias, ${entry.aliasOf}`);
      }
    }
    for (const longhand of entry.writes ?? []) {
      if (!Object.hasOwn(entries, longhand)) {
        throw new Error(`${name} writes unknown property ${longhand}`);
      }
    }
  }
}

/**
 * Every logical property group has as many physical members as flow-relative
 * ones, and at least one of each.
 *
 * @param {Record<string, PropertyEntry>} entries
 * @return {void}
 */
function validateGroupSides(entries) {
  /** @type {Map<string, {physical: number, flow: number}>} */
  const groups = new Map();
  for (const entry of Object.values(entries)) {
    if (entry.group === undefined) continue;
    const counts = groups.get(entry.group) ?? { physical: 0, flow: 0 };
    counts[entry.side === 'flow-relative' ? 'flow' : 'physical']++;
    groups.set(entry.group, counts);
  }
  for (const [group, counts] of groups) {
    if (counts.physical !== counts.flow || counts.physical === 0) {
      throw new Error(
        `Logical property group ${group} is split ${counts.physical} physical / ${counts.flow} flow-relative`
      );
    }
  }
}

/**
 * Every longhand a family table says a shorthand sets is written by it. A
 * reset such as `border-image` is a shorthand in its own right, so the check
 * compares what that name writes, not its name.
 *
 * @param {Record<string, PropertyEntry>} entries
 * @param {{ shorthands: string[], setsLonghands: (name: string) => Set<string> }} family
 * @return {void}
 */
function validateFamilyWrites(entries, family) {
  for (const shorthand of family.shorthands) {
    const writes = new Set(entries[shorthand]?.writes);
    for (const member of family.setsLonghands(shorthand)) {
      for (const longhand of entries[member]?.writes ?? [member]) {
        if (longhand !== shorthand && !writes.has(longhand)) {
          throw new Error(
            `${shorthand} sets ${longhand} in the family tables but not in writes`
          );
        }
      }
    }
  }
}

/**
 * The text of the generated property table.
 *
 * @param {Record<string, PropertyEntry>} entries
 * @return {string}
 */
export function serializeProperties(entries) {
  return serializeJson({ properties: entries });
}
