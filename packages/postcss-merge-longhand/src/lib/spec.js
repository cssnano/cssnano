'use strict';
const data = require('../data/longhands.json');

/**
 * The shorthand structure and keyword sets the transforms rely on, derived from
 * the specifications by `script/acquire.mjs`. The generated file is JSON, so
 * its maps arrive as plain objects, and a property name comes from the
 * stylesheet: never index those objects directly.
 */
const shorthands = new Map(Object.entries(data.shorthands));
const initialValues = new Map(Object.entries(data.initialValues));

/**
 * @param {string} name
 * @return {{longhands: string[], resets: string[]}}
 */
function shorthand(name) {
  const definition = shorthands.get(name);

  if (!definition) {
    throw new Error(`${name} is not a shorthand the generated data covers`);
  }

  return definition;
}

module.exports = {
  /** The sides of the box, in the order a shorthand lists them. */
  sides: data.sides,
  /** The parts of a border, in the order `border` lists them. */
  borderComponents: data.borderComponents,
  shorthand,
  initialValues,
  borderProperties: new Set(data.borderProperties),
  flowRelativeBorderProperties: new Set(data.flowRelativeBorderProperties),
  cssWideKeywords: new Set(data.cssWideKeywords),
  lineStyles: new Set(data.lineStyles),
  lineWidthKeywords: new Set(data.lineWidthKeywords),
  namedColors: new Set(data.namedColors),
  colorFunctions: new Set(data.colorFunctions),
};
