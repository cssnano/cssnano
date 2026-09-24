import { REFERENCE, keywordTerminals } from '../../../../util/webref.mjs';

/**
 * @typedef {object} WebrefDefinition
 * @property {string} name
 * @property {string} [syntax] Value grammar, absent when a spec only defines
 * the term in prose.
 *
 * @typedef {WebrefDefinition & {
 *   legacyAliasOf?: string,
 *   longhands?: string[],
 *   resetLonghands?: string[]
 * }} WebrefProperty
 *
 * @typedef {WebrefDefinition & {
 *   descriptors?: WebrefDefinition[]
 * }} WebrefAtRule
 *
 * @typedef {object} WebrefData
 * @property {WebrefProperty[]} properties
 * @property {WebrefAtRule[]} atrules
 * @property {WebrefDefinition[]} types
 * @property {WebrefDefinition[]} functions
 */

const VENDOR_PREFIX = /^-\w+-/v;

export { keywordTerminals };

/**
 * The productions a grammar names directly, without following them any
 * further. Property references are returned quoted, the way they are spelled,
 * so that `<'color'>` cannot be mistaken for `<color>`.
 *
 * @param {string} syntax
 * @return {string[]}
 */
export function directReferences(syntax) {
  /** @type {string[]} */
  const references = [];
  for (const [, property, type] of syntax.matchAll(REFERENCE)) {
    references.push(property === undefined ? type : `'${property}'`);
  }
  return references;
}

/**
 * Splits a function's grammar into its comma separated arguments, e.g.
 * `counters( <counter-name>, <string>, <counter-style>? )` into three. Commas
 * nested in a group belong to that group rather than to the argument list.
 *
 * @param {string} syntax
 * @return {string[]}
 */
export function functionArguments(syntax) {
  const open = syntax.indexOf('(');
  const close = syntax.lastIndexOf(')');
  if (open === -1 || close < open) {
    return [];
  }
  const body = syntax.slice(open + 1, close);
  /** @type {string[]} */
  const args = [];
  let depth = 0;
  let current = '';
  for (const character of body) {
    if (character === '[' || character === '(') {
      depth++;
    } else if (character === ']' || character === ')') {
      depth--;
    }
    if (character === ',' && depth === 0) {
      args.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  args.push(current);
  return args.map((argument) => argument.trim());
}

/**
 * Return the functions that name a counter and where the counter and its
 * style sit in their arguments. webref spells the counter `<counter-name>`
 * in `counter()` but `<custom-ident>` in `target-counter()`, so count an
 * identifier argument as a counter name whenever the function also takes a
 * counter style.
 *
 * @param {WebrefDefinition[]} functions
 * @return {{
 *   counterFunctions: Map<string, number[]>,
 *   counterStyleFunctions: Map<string, number[]>
 * }}
 */
export function counterFunctionSlots(functions) {
  /** @type {Map<string, number[]>} */
  const counterFunctions = new Map();
  /** @type {Map<string, number[]>} */
  const counterStyleFunctions = new Map();

  for (const { name, syntax } of functions) {
    if (!syntax) {
      continue;
    }
    /** @type {number[]} */
    const styleArguments = [];
    /** @type {number[]} */
    const nameArguments = [];

    for (const [index, argument] of functionArguments(syntax).entries()) {
      const references = directReferences(argument);
      if (
        references.includes('counter-style') ||
        references.includes('counter-style-name')
      ) {
        styleArguments.push(index);
      } else if (
        references.includes('counter-name') ||
        references.includes('custom-ident')
      ) {
        nameArguments.push(index);
      }
    }

    if (styleArguments.length === 0) {
      continue;
    }
    counterStyleFunctions.set(name, styleArguments);
    if (nameArguments.length > 0) {
      counterFunctions.set(name, nameArguments);
    }
  }

  return { counterFunctions, counterStyleFunctions };
}

/**
 * @param {Map<string, number[]>} functionSlots
 * @return {(reach: Set<string>) => boolean}
 */
export function takesOneOf(functionSlots) {
  return (reach) => [...functionSlots.keys()].some((name) => reach.has(name));
}

/**
 * The keyword alternatives a grammar offers, ignoring anything that is a
 * reference to another production.
 *
 * @param {string | undefined} syntax
 * @return {string[]}
 */
export function keywordsOf(syntax) {
  if (!syntax) {
    return [];
  }
  return syntax
    .split('|')
    .map((alternative) => alternative.trim())
    .filter((alternative) => /^[a-z][a-z\-]*$/v.test(alternative))
    .toSorted();
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
 * @param {WebrefAtRule[]} atrules
 * @param {string} atRuleName
 * @param {(syntax: string) => boolean} predicate
 * @return {WebrefDefinition[]}
 */
export function descriptorsWhere(atrules, atRuleName, predicate) {
  const atrule = atrules.find((candidate) => candidate.name === atRuleName);
  /** @type {WebrefDefinition[]} */
  const found = [];
  for (const descriptor of atrule?.descriptors ?? []) {
    if (descriptor.syntax && predicate(descriptor.syntax)) {
      found.push(descriptor);
    }
  }
  return found.toSorted((a, b) => (a.name < b.name ? -1 : 1));
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
