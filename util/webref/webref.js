/**
 * The parts of the `@webref/css` data the plugin generators read.
 *
 * @typedef {object} WebrefDefinition
 * @property {string} name
 * @property {string} [syntax] Value grammar, absent when a spec only defines
 * the term in prose.
 *
 * @typedef {WebrefDefinition & {
 *   initial?: string,
 *   legacyAliasOf?: string,
 *   longhands?: string[],
 *   resetLonghands?: string[],
 *   logicalPropertyGroup?: string
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

/**
 * Matches a reference to another CSS grammar production.
 */
export const REFERENCE = /<(?:'([^'>]+)'|([^'>\s]+)(?:\s+\[[^\]]*\])?)>/gv;

/**
 * Looks every grammar up by the name a reference spells it with. A type or
 * function can be defined by more than one spec, e.g. `<content-list>` by both
 * css-content and css-gcpm, so the alternatives are pooled. Properties are
 * keyed quoted, `'color'`, so that they cannot be mistaken for `<color>`.
 *
 * @param {{
 *   properties: WebrefDefinition[],
 *   types?: WebrefDefinition[],
 *   functions?: WebrefDefinition[]
 * }} data
 * @return {Map<string, string>}
 */
export function grammarsByName({ properties, types = [], functions = [] }) {
  /** @type {Map<string, string>} */
  const grammars = new Map();
  for (const definition of [...types, ...functions]) {
    if (!definition.syntax) {
      continue;
    }
    const existing = grammars.get(definition.name);
    grammars.set(
      definition.name,
      existing === undefined
        ? definition.syntax
        : `${existing} | ${definition.syntax}`
    );
  }
  for (const property of properties) {
    if (property.syntax) {
      grammars.set(`'${property.name}'`, property.syntax);
    }
  }
  return grammars;
}

/**
 * The keyword alternatives a grammar offers at its own level, ignoring
 * anything that is a reference to another production.
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
 * Flow-relative properties are named after the block and inline axes rather
 * than after the sides of the box, e.g. `margin-inline-start` or
 * `inline-size`. webref does not flag them, but the naming is consistent
 * throughout.
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
 * Returns the literal keywords a grammar offers. Function calls do not count:
 * their names cannot be written as bare keywords.
 *
 * @param {string} [syntax]
 * @return {string[]}
 */
export function keywordTerminals(syntax) {
  if (!syntax) {
    return [];
  }

  const literals = syntax.replace(REFERENCE, ' ');
  /** @type {string[]} */
  const keywords = [];

  for (const match of literals.matchAll(/[a-zA-Z][a-zA-Z0-9\-]*/gv)) {
    const [keyword] = match;
    const rest = literals.slice(
      /** @type {number} */ (match.index) + keyword.length
    );

    if (!/^\s*\(/v.test(rest)) {
      keywords.push(keyword);
    }
  }

  return keywords;
}

/**
 * The productions a grammar names directly, without following them any
 * further. Property references are returned quoted, the way they are spelled,
 * so that `<'color'>` cannot be mistaken for `<color>`.
 *
 * @param {string} syntax
 * @return {string[]}
 */
export function directReferences(syntax) {
  if (!syntax) {
    return [];
  }
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
 * @param {string} [syntax]
 * @return {string[]}
 */
export function functionArguments(syntax) {
  if (!syntax) {
    return [];
  }
  const open = syntax.indexOf('(');
  const close = syntax.lastIndexOf(')');
  if (open === -1 || close <= open) {
    return [];
  }
  const body = syntax.slice(open + 1, close);
  if (!body.trim()) {
    return [];
  }
  /** @type {string[]} */
  const args = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const character = body[i];
    if (character === '[' || character === '(' || character === '{') {
      depth++;
    } else if (character === ']' || character === ')' || character === '}') {
      depth--;
    } else if (character === ',' && depth === 0) {
      args.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  args.push(body.slice(start).trim());
  return args;
}

/**
 * Orders `[name, value]` entries by name, so that generated files do not
 * depend on the order webref lists its data in.
 *
 * @template T
 * @param {Iterable<[string, T]>} entries
 * @return {[string, T][]}
 */
export function sortedByName(entries) {
  return [...entries].toSorted(([a], [b]) => (a < b ? -1 : 1));
}

/**
 * Fails the data refresh when a webref release no longer lists something the
 * plugin's transforms rely on.
 *
 * @param {string[]} actual
 * @param {string[]} expected
 * @param {string} what
 * @return {void}
 */
export function expectAll(actual, expected, what) {
  for (const name of expected) {
    if (!actual.includes(name)) {
      throw new Error(`Expected ${what} to include ${name}`);
    }
  }
}

/**
 * Fails the data refresh when a webref release lists something the plugin's
 * transforms must not treat as supported.
 *
 * @param {string[]} actual
 * @param {string[]} forbidden
 * @param {string} what
 * @return {void}
 */
export function expectNone(actual, forbidden, what) {
  for (const name of forbidden) {
    if (actual.includes(name)) {
      throw new Error(`Expected ${what} not to include ${name}`);
    }
  }
}
