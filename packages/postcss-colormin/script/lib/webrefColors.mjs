import { REFERENCE } from '../../../../util/webref.mjs';

/**
 * Derives the CSS properties whose grammar transitively accepts <color>.
 * Kept free of I/O so that it can be unit tested.
 *
 * @typedef {object} WebrefDefinition
 * @property {string} name
 * @property {string} [syntax]
 *
 * @typedef {WebrefDefinition & {
 *   legacyAliasOf?: string,
 *   longhands?: string[],
 *   resetLonghands?: string[]
 * }} WebrefProperty
 *
 * @typedef {object} WebrefData
 * @property {WebrefProperty[]} properties
 * @property {WebrefDefinition[]} [types]
 * @property {WebrefDefinition[]} [functions]
 */

const COLOR_PROPERTIES_WITH_COLOR_FUNCTIONS = [
  'background-image',
  'border-image',
  'border-image-source',
  'fill',
  'stroke',
];
const COMPAT_COLOR_PROPERTIES = [
  '-webkit-text-fill-color',
  '-webkit-text-stroke-color',
  'tap-highlight-color',
];

/**
 * Extracts direct references from a CSS grammar production.
 * Property references are quoted (<'foo'> -> "'foo'").
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
 * @param {WebrefData} data
 * @return {string[]}
 */
export function buildColorProperties({
  properties,
  types = [],
  functions = [],
}) {
  /** @type {Map<string, string>} */
  const grammars = new Map();
  for (const def of [...types, ...functions]) {
    if (!def.syntax) {
      continue;
    }
    const key = def.name;
    const existing = grammars.get(key);
    grammars.set(
      key,
      existing === undefined ? def.syntax : `${existing} | ${def.syntax}`
    );
  }
  for (const prop of properties) {
    if (prop.syntax) {
      grammars.set(`'${prop.name}'`, prop.syntax);
    }
  }

  /**
   * @param {string | undefined} syntax
   * @return {boolean}
   */
  function reachesColor(syntax) {
    if (!syntax) {
      return false;
    }
    /** @type {Set<string>} */
    const seen = new Set();
    /** @type {string[]} */
    const queue = [syntax];
    while (queue.length > 0) {
      const current = /** @type {string} */ (queue.pop());
      for (const ref of directReferences(current)) {
        if (ref === 'color') {
          return true;
        }
        if (seen.has(ref)) {
          continue;
        }
        seen.add(ref);
        // Function grammars describe arguments; a property's value has the
        // function's result type, not every type accepted by its arguments.
        if (ref.endsWith('()')) {
          continue;
        }
        const nextSyntax = grammars.get(ref);
        if (nextSyntax) {
          queue.push(nextSyntax);
        }
      }
    }
    return false;
  }

  /** @type {string[]} */
  const colorProperties = [];
  for (const prop of properties) {
    if (prop.name.startsWith('--') || prop.legacyAliasOf) {
      continue;
    }
    if (reachesColor(prop.syntax)) {
      colorProperties.push(prop.name);
    }
  }

  colorProperties.push(
    ...COLOR_PROPERTIES_WITH_COLOR_FUNCTIONS,
    ...COMPAT_COLOR_PROPERTIES
  );

  return [...new Set(colorProperties)].toSorted();
}

/**
 * @param {string[]} actual
 * @param {string[]} expected
 * @param {string} what
 */
function expectAll(actual, expected, what) {
  for (const name of expected) {
    if (!actual.includes(name)) {
      throw new Error(`Expected ${what} to include ${name}`);
    }
  }
}

/**
 * @param {string[]} actual
 * @param {string[]} forbidden
 * @param {string} what
 */
function expectNone(actual, forbidden, what) {
  for (const name of forbidden) {
    if (actual.includes(name)) {
      throw new Error(`Expected ${what} not to include ${name}`);
    }
  }
}

/**
 * Enforces strict shape invariants on the extracted color properties.
 *
 * @param {string[]} data
 * @return {void}
 */
export function validate(data) {
  if (!Array.isArray(data) || data.length < 57) {
    throw new Error(
      `Expected at least 57 color properties, got ${data?.length}`
    );
  }
  expectAll(
    data,
    [
      'background',
      'border',
      'outline',
      'column-rule',
      'text-decoration',
      'text-emphasis',
      'box-shadow',
      'text-shadow',
      'caret',
      'accent-color',
      'scrollbar-color',
      'background-image',
      'border-image',
      'border-image-source',
      'fill',
      'stroke',
      '-webkit-text-fill-color',
      '-webkit-text-stroke-color',
      'tap-highlight-color',
    ],
    'color properties'
  );
  expectNone(
    data,
    [
      'animation',
      'animation-name',
      'counter-reset',
      'grid-area',
      'container-name',
      'view-transition-name',
      'content',
      'list-style',
      'list-style-type',
      'list-style-image',
      'shape-outside',
      'mask-image',
      'filter',
    ],
    'color properties'
  );
}

/**
 * @param {string[]} data
 * @return {string}
 */
export function serialize(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}
