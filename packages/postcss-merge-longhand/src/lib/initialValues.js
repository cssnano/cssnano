'use strict';
const topRightBottomLeft = require('./trbl.js');

/** @type {Map<string, string>} */
const initialValues = new Map([
  ['border-width', 'medium'],
  ['border-style', 'none'],
  ['border-color', 'currentcolor'],
  ['column-width', 'auto'],
  ['column-count', 'auto'],
]);

for (const direction of topRightBottomLeft) {
  initialValues.set(`margin-${direction}`, '0');
  initialValues.set(`padding-${direction}`, '0');

  for (const [prop, value] of [
    ['width', 'medium'],
    ['style', 'none'],
    ['color', 'currentcolor'],
  ]) {
    initialValues.set(`border-${direction}-${prop}`, value);
  }
}

/**
 * Explode fills in the initial value for any component a shorthand leaves out,
 * so a declaration carrying it may never have been written at all.
 *
 * @param {import('postcss').Declaration} declaration
 * @return {boolean} whether the declaration restates its initial value
 */
module.exports = (declaration) =>
  initialValues.get(declaration.prop.toLowerCase()) ===
  declaration.value.toLowerCase();
