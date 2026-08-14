'use strict';

const { list } = require('postcss');
const stylehacks = require('stylehacks');
const spec = require('../spec.js');
const parseWsc = require('../parseWsc.js');
const parseTrbl = require('../parseTrbl.js');
const minifyWsc = require('../minifyWsc.js');
const {
  isValidWidthStyleColor,
  specifiesComponent,
  specifiesDistinctComponents,
} = require('../validateWsc.js');
const isCustomProp = require('../isCustomProp.js');
const { requiredSupport } = require('../isFallback.js');
const canExplode = require('../canExplode.js');
const cssGlobalKeywords = require('../cssGlobalKeywords.js');
const insertCloned = require('../insertCloned.js');

/** @import {Declaration, Rule} from 'postcss'; */

const sides = spec.sides;
const components = spec.borderComponents;
const sideShorthands = sides.map((side) => `border-${side}`);
const componentShorthands = spec.shorthand('border').longhands;
const sideComponents = sideShorthands.flatMap((side) =>
  components.map((component) => `${side}-${component}`)
);
const physicalProperties = new Set([
  'border',
  ...sideShorthands,
  ...componentShorthands,
  ...sideComponents,
]);
const initialTriple = components.map(
  (component) =>
    /** @type {string} */ (spec.initialValues.get(`border-${component}`))
);
/* `border` covers these without naming them, and the flow-relative properties
 * resolve against a writing mode this cannot see. */
const opaqueProperties = spec.flowRelativeBorderProperties.union(
  new Set(spec.shorthand('border').resets)
);

/**
 * @param {Declaration} decl
 * @return {boolean} whether the declaration sets every part of every border,
 * so that nothing before it survives
 */
function establishesBorderReset(decl) {
  return (
    decl.prop.toLowerCase() === 'border' &&
    canExplode(decl) &&
    !stylehacks.detect(decl) &&
    specifiesDistinctComponents(decl.value) &&
    isValidWidthStyleColor(parseWsc(decl.value))
  );
}

/**
 * Support can be required for two reasons, so both must be checked: a
 * `var()` value hides how many tokens it expands to, while a value using an
 * unsupported colour function can be identified but would cause browsers to
 * reject the entire shorthand if serialized.
 *
 * @param {Declaration} decl
 * @param {boolean} important the flag the rest of the border carries
 * @return {boolean} whether the declaration can be read into the grid and
 * written back out without losing anything
 */
function isResolvable(decl, important) {
  if (
    decl.important !== important ||
    stylehacks.detect(decl) ||
    isCustomProp(decl) ||
    cssGlobalKeywords.has(decl.value.toLowerCase()) ||
    requiredSupport(decl).size
  ) {
    return false;
  }

  const prop = decl.prop.toLowerCase();
  const tokens = list.space(decl.value);

  if (prop === 'border' || sideShorthands.includes(prop)) {
    return (
      tokens.length <= components.length &&
      specifiesDistinctComponents(decl.value)
    );
  }

  /* A cell only holds what the property it came from can be set to: a value the
   * browser ignores, such as `border-color: none`, specifies no colour to read. */
  const component = /** @type {string} */ (prop.split('-').at(-1));

  if (componentShorthands.includes(prop)) {
    return (
      tokens.length <= sides.length &&
      parseTrbl(decl.value).every((value) =>
        specifiesComponent(value, component)
      )
    );
  }

  return specifiesComponent(decl.value, component);
}

/* Precomputed byte cost of the `!important` flag for size calculations. */
const IMPORTANT = '!important'.length;

/**
 * Two declaration sets being compared can differ in count (one side split
 * into components vs. one shorthand, or a resolved grid vs. its source
 * shorthands), so serialised length is the only valid comparison.
 *
 * @param {{prop: string, value: string}[]} declarations
 * @param {boolean} important whether each one carries `!important`
 * @return {number} what the declarations take up, `:` and `;` included
 */
function size(declarations, important) {
  let total = 0;

  for (const { prop, value } of declarations) {
    total += prop.length + value.length + 2 + (important ? IMPORTANT : 0);
  }

  return total;
}

/**
 * Reads the physical border declarations into a matrix of one width, style and
 * colour per side, in document order, so that each one overwrites the cells it
 * names.
 *
 * @param {Declaration[]} declarations from the reset onwards
 * @return {string[][]} a triple per side, in the order `spec.sides` gives
 */
function fillGrid(declarations) {
  const matrix = sides.map(() => [...initialTriple]);

  for (const decl of declarations) {
    const prop = decl.prop.toLowerCase();
    const sideIndex = sideShorthands.indexOf(
      prop.split('-').slice(0, 2).join('-')
    );
    const componentIndex = componentShorthands.indexOf(
      `border-${/** @type {string} */ (prop.split('-').at(-1))}`
    );

    if (prop === 'border' || sideShorthands.includes(prop)) {
      const wsc = parseWsc(decl.value);
      const triple = initialTriple.map((initial, i) => wsc[i] || initial);

      for (const [i, cells] of matrix.entries()) {
        if (prop === 'border' || i === sideIndex) {
          cells.splice(0, cells.length, ...triple);
        }
      }
    } else if (componentShorthands.includes(prop)) {
      for (const [i, value] of parseTrbl(decl.value).entries()) {
        matrix[i][componentShorthands.indexOf(prop)] = value;
      }
    } else {
      matrix[sideIndex][componentIndex] = decl.value;
    }
  }

  return matrix;
}

/**
 * @param {string[][]} matrix
 * @return {string[]} the triple the most sides share, which `border` carries
 */
function commonTriple(matrix) {
  let winner = matrix[0];
  let seen = 0;

  for (const triple of matrix) {
    const count = matrix.filter((other) =>
      other.every((value, i) => value === triple[i])
    ).length;

    if (count > seen) {
      seen = count;
      winner = triple;
    }
  }

  return winner;
}

/**
 * Writes the matrix back out as a `border` for the triple most sides share, and
 * the shortest serialization for each side that differs.
 *
 * @param {string[][]} matrix
 * @param {boolean} important whether the rule's declarations specify it
 * @return {{prop: string, value: string}[]}
 */
function serialise(matrix, important) {
  const base = commonTriple(matrix);
  const declarations = [{ prop: 'border', value: minifyWsc(base.join(' ')) }];

  for (const [i, triple] of matrix.entries()) {
    const differing = triple
      .map((value, component) => ({ value, component }))
      .filter(({ value, component }) => value !== base[component]);

    if (!differing.length) {
      continue;
    }

    const asComponents = differing.map(({ value, component }) => ({
      prop: `${sideShorthands[i]}-${components[component]}`,
      value,
    }));
    const asSide = [
      { prop: sideShorthands[i], value: minifyWsc(triple.join(' ')) },
    ];

    declarations.push(
      ...(size(asComponents, important) < size(asSide, important)
        ? asComponents
        : asSide)
    );
  }

  return declarations;
}

/**
 * This duplicates the main pipeline's intent for one case it can't otherwise
 * merge (a `border` reset followed by plain values), so it must stay guarded
 * by `containsUnmergeableBorderDecls` to avoid double-handling input.
 *
 * @param {Rule} rule
 * @return {void}
 */
module.exports = function resolveBorderGrid(rule) {
  /** @type {Declaration[]} */
  const physical = [];

  for (const node of rule.nodes) {
    if (node.type !== 'decl') {
      continue;
    }

    const prop = node.prop.toLowerCase();

    /* The rule was handed over for one of several reasons, and this resolver
     * answers only the last of them. */
    if (opaqueProperties.has(prop)) {
      return;
    }

    if (physicalProperties.has(prop)) {
      physical.push(node);
    }
  }

  const reset = physical.findIndex(establishesBorderReset);

  if (reset === -1) {
    return;
  }

  const important = physical[0].important;

  if (!physical.every((decl) => isResolvable(decl, important))) {
    return;
  }

  const resolved = serialise(fillGrid(physical.slice(reset)), important);

  if (size(resolved, important) >= size(physical, important)) {
    return;
  }

  let previous = physical[reset];

  for (const { prop, value } of resolved) {
    previous = insertCloned(rule, previous, { prop, value, important });
  }

  for (const decl of physical) {
    decl.remove();
  }
};
