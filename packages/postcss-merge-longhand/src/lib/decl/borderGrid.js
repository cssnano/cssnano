'use strict';

const { list } = require('postcss');
const stylehacks = require('stylehacks');
const spec = require('../spec.js');
const parseWsc = require('../parseWsc.js');
const parseTrbl = require('../parseTrbl.js');
const minifyWsc = require('../minifyWsc.js');
const {
  isValidWidthStyleColor,
  statesComponent,
  statesDistinctComponents,
} = require('../validateWsc.js');
const isCustomProp = require('../isCustomProp.js');
const { requiredGates } = require('../isFallback.js');
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
    statesDistinctComponents(decl.value) &&
    isValidWidthStyleColor(parseWsc(decl.value))
  );
}

/**
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
    requiredGates(decl).size
  ) {
    return false;
  }

  const prop = decl.prop.toLowerCase();
  const tokens = list.space(decl.value);

  if (prop === 'border' || sideShorthands.includes(prop)) {
    return (
      tokens.length <= components.length && statesDistinctComponents(decl.value)
    );
  }

  /* A cell only holds what the property it came from can be set to: a value the
   * browser drops, such as `border-color: none`, states no colour to read. */
  const component = /** @type {string} */ (prop.split('-').at(-1));

  if (componentShorthands.includes(prop)) {
    return (
      tokens.length <= sides.length &&
      parseTrbl(decl.value).every((value) => statesComponent(value, component))
    );
  }

  return tokens.length === 1 && statesComponent(decl.value, component);
}

/**
 * @param {{prop: string, value: string}[]} declarations
 * @return {number} what the declarations take up, `:` and `;` included
 */
function size(declarations) {
  let total = 0;

  for (const { prop, value } of declarations) {
    total += prop.length + value.length + 2;
  }

  return total;
}

/**
 * Reads the physical border declarations into a grid of one width, style and
 * colour per side, in document order, so that each one overwrites the cells it
 * names.
 *
 * @param {Declaration[]} declarations from the reset onwards
 * @return {string[][]} a triple per side, in the order `spec.sides` gives
 */
function fillGrid(declarations) {
  const grid = sides.map(() => [...initialTriple]);

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

      for (const [i, cells] of grid.entries()) {
        if (prop === 'border' || i === sideIndex) {
          cells.splice(0, cells.length, ...triple);
        }
      }
    } else if (componentShorthands.includes(prop)) {
      for (const [i, value] of parseTrbl(decl.value).entries()) {
        grid[i][componentShorthands.indexOf(prop)] = value;
      }
    } else {
      grid[sideIndex][componentIndex] = decl.value;
    }
  }

  return grid;
}

/**
 * @param {string[][]} grid
 * @return {string[]} the triple the most sides share, which `border` carries
 */
function commonTriple(grid) {
  let winner = grid[0];
  let seen = 0;

  for (const triple of grid) {
    const count = grid.filter((other) =>
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
 * Writes the grid back out as a `border` for the triple most sides share, and
 * the least it takes to state how each remaining side differs.
 *
 * @param {string[][]} grid
 * @return {{prop: string, value: string}[]}
 */
function serialise(grid) {
  const base = commonTriple(grid);
  const declarations = [{ prop: 'border', value: minifyWsc(base.join(' ')) }];

  for (const [i, triple] of grid.entries()) {
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
      ...(size(asComponents) < size(asSide) ? asComponents : asSide)
    );
  }

  return declarations;
}

/**
 * The border pipeline gives up on a rule that mixes `border-width`,
 * `border-style` or `border-color` with a per-side property, because its
 * transforms take the declarations a pair at a time and cannot see what the
 * whole set computes to. Resolving them against one grid can, for the one shape
 * where nothing else stands in the way: a `border` reset the plugin may re-emit
 * for free, and plain values after it.
 *
 * This duplicates the pipeline's intent, so it has to stay behind
 * `containsUnmergeableBorderDecls` — the two must never see the same input.
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

  const resolved = serialise(fillGrid(physical.slice(reset)));

  if (size(resolved) >= size(physical)) {
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
