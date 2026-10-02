import {
  directReferences,
  expectAll,
  expectNone,
  grammarsByName,
} from '../../../../util/webref/webref.js';

export { directReferences };

/**
 * Derives the CSS properties whose grammar transitively accepts <color>.
 * Kept free of I/O so that it can be unit tested.
 *
 * @typedef {import('../../../../util/webref/webref.js').WebrefProperty} WebrefProperty
 * @typedef {import('../../../../util/webref/webref.js').WebrefDefinition} WebrefDefinition
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
 * @param {WebrefData} data
 * @return {string[]}
 */
export function buildColorProperties({
  properties,
  types = [],
  functions = [],
}) {
  const grammars = grammarsByName({ properties, types, functions });

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
