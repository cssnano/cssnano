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
 * Flow-relative properties are named after the block/inline axes rather than
 * after the sides of the box, e.g. `margin-inline-start` or `inline-size`.
 * webref does not flag them, but the naming is consistent throughout, and
 * `validate` checks that every group ends up split in two.
 *
 * @param {string} name
 * @return {boolean}
 */
export function isFlowRelative(name) {
  const segments = new Set(name.split('-'));
  return (
    segments.has('block') ||
    segments.has('inline') ||
    segments.has('start') ||
    segments.has('end')
  );
}

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
  return new Map([...map].toSorted(([a], [b]) => (a < b ? -1 : 1)));
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
  // sync with the `cases` in test/propertyRelations.js: this catches a
  // future webref release dropping a relation, that catches a regression in
  // how propertyRelations.js consumes the data.
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
 * Maps only exist in memory; the generated file is JSON.
 *
 * @param {PropertyGroups} data
 * @return {string}
 */
export function serialize(data) {
  return `${JSON.stringify(
    {
      properties: data.properties,
      aliases: Object.fromEntries(data.aliases),
      shorthands: Object.fromEntries(data.shorthands),
      logicalGroups: Object.fromEntries(data.logicalGroups),
      flowRelative: data.flowRelative,
    },
    null,
    2
  )}\n`;
}
