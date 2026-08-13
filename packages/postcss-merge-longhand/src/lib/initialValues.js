'use strict';
const { initialValues } = require('./spec.js');

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
