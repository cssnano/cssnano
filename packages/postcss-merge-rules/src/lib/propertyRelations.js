'use strict';

const data = require('../data/propertyGroups.json');

const vendorPrefixRegex = /^-\w+-/;
/**
 * @param {string} prop
 * @return {string}
 */
function vendorUnprefixed(prop) {
  return prop.replace(vendorPrefixRegex, '');
}

// The generated file is JSON, so its maps arrive as plain objects. Property
// names come from the stylesheet, and `constructor` or `toString` are things a
// declaration can be called, so never index those objects directly.
const knownProperties = new Set(data.properties);
const aliases = new Map(Object.entries(data.aliases));
const shorthands = new Map(Object.entries(data.shorthands));
const logicalGroups = new Map(Object.entries(data.logicalGroups));
const flowRelative = new Set(data.flowRelative);

const ALL = 'all';

/**
 * An alias target, or the candidate itself if it's a known property outright.
 *
 * @param {string} candidate
 * @return {string|undefined}
 */
function lookupProperty(candidate) {
  const alias = aliases.get(candidate);
  if (alias !== undefined) {
    return alias;
  }
  return knownProperties.has(candidate) ? candidate : undefined;
}

/**
 * Resolves a property to the name the generated data knows it by: vendor
 * prefixed spellings collapse onto the property they alias, and a prefix we
 * have no data for is dropped, since moving `-webkit-background-clip` past a
 * `background` shorthand is as unsafe as moving the unprefixed property. Webref
 * lists some prefixed spellings, like `-webkit-user-select`, as properties in
 * their own right with no alias back to the unprefixed one, so the unprefixed
 * spelling is always tried first, not just when the prefixed one is unknown.
 *
 * @param {string} name Lowercased property name.
 * @return {{name: string, known: boolean}}
 */
function resolveProperty(name) {
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
 * The longhands a property sets. A longhand sets only itself.
 *
 * @param {string} name
 * @return {string[]}
 */
function longhandsOf(name) {
  return shorthands.get(name) ?? [name];
}

/**
 * True if two longhands can be the same physical property. Beyond being the
 * same property, that happens between the flow-relative and the physical
 * members of a logical property group, since `margin-inline-start` is
 * `margin-top` under a vertical writing mode. Two physical members, or two
 * flow-relative ones, always address different sides.
 *
 * @param {string} a
 * @param {string} b
 * @return {boolean}
 */
function isSameLonghand(a, b) {
  if (a === b) {
    return true;
  }
  const group = logicalGroups.get(a);
  return (
    group !== undefined &&
    group === logicalGroups.get(b) &&
    flowRelative.has(a) !== flowRelative.has(b)
  );
}

/**
 * The name-based approximation the plugin relied on before it had property
 * data: two properties interact when they share their leading segment and
 * their remaining segments either match or differ in number. `place` is
 * treated as a wildcard leading segment, since `place-content` expands to
 * `align-content`/`justify-content` and the like. Reached only for vendor
 * extensions no spec describes, such as `-webkit-box-direction`.
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
 * True if declarations of `propA` and `propB` can set the same underlying
 * property, so that reordering them within a rule can change what the rule
 * computes to. The relation is symmetric: a shorthand setting a longhand and a
 * longhand overriding part of a shorthand are the same conflict seen from
 * either end.
 *
 * @param {string} propA
 * @param {string} propB
 * @return {boolean}
 */
function isConflictingProp(propA, propB) {
  if (propA === propB) {
    return true;
  }
  // Nothing sets a custom property except itself, and custom properties are
  // case-sensitive, so this must run before the names are lowercased below.
  if (propA.startsWith('--') || propB.startsWith('--')) {
    return false;
  }
  const nameA = propA.toLowerCase();
  const nameB = propB.toLowerCase();
  if (nameA === nameB) {
    return true;
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
    // A vendor extension the data says nothing about. The shorthand relations
    // that would settle it are exactly what is missing, so fall back to
    // comparing the names.
    return conflictingSegments(a.name, b.name);
  }
  for (const longhandA of longhandsOf(a.name)) {
    for (const longhandB of longhandsOf(b.name)) {
      if (isSameLonghand(longhandA, longhandB)) {
        return true;
      }
    }
  }
  return false;
}

module.exports = { isConflictingProp };
