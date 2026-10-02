import {
  directReferences,
  functionArguments,
  keywordTerminals,
} from '../../../../util/webref/webref.js';

/** @import {WebrefAtRule, WebrefDefinition, WebrefProperty} from '../../../../util/webref.js'; */

const VENDOR_PREFIX = /^-\w+-/v;

export { directReferences, functionArguments, keywordTerminals };

/**
 * @param {Map<string, number[]>} functionSlots
 * @return {(reach: Set<string>) => boolean}
 */
export function takesOneOf(functionSlots) {
  return (reach) => [...functionSlots.keys()].some((name) => reach.has(name));
}

/**
 * The unprefixed name of an at-rule the plugin defines identifiers with. The
 * prefixed spellings webref lists, such as `@-webkit-keyframes`, collapse onto
 * it, the same way the plugin unprefixes an at-rule before comparing.
 *
 * @param {WebrefAtRule[]} atrules
 * @param {string} name
 * @return {string}
 */
export function unprefixedAtRule(atrules, name) {
  const found = atrules.some(
    (atrule) => atrule.name.slice(1).replace(VENDOR_PREFIX, '') === name
  );
  if (!found) {
    throw new Error(`webref does not define the @${name} rule`);
  }
  return name;
}

/**
 * The property itself and every shorthand that sets it.
 *
 * @param {string} longhand
 * @param {WebrefProperty[]} properties
 * @return {string[]}
 */
export function shorthandsOf(longhand, properties) {
  const byName = new Map(
    properties.map((property) => [property.name, property])
  );
  /** @type {string[]} */
  const names = [];
  for (const property of properties) {
    if (property.name === longhand || sets(property, longhand)) {
      names.push(property.name);
    }
  }
  return names.toSorted();

  /**
   * @param {WebrefProperty} property
   * @param {string} target
   * @param {Set<string>} [seen]
   * @return {boolean}
   */
  function sets(property, target, seen = new Set()) {
    if (seen.has(property.name)) {
      return false;
    }
    seen.add(property.name);
    for (const part of [
      ...(property.longhands ?? []),
      ...(property.resetLonghands ?? []),
    ]) {
      const definition = byName.get(part);
      if (part === target || (definition && sets(definition, target, seen))) {
        return true;
      }
    }
    return false;
  }
}
