/** @import {Declaration} from 'postcss' */
/** @import {DeclarationKeys} from './declarationKey.js' */
/** @import {PropertyKeys, PropertyTable} from './propertyTable.js' */

/**
 * One declaration of a merge run, held beside the PostCSS node it describes.
 * Rule merging moves and removes declarations but never changes their
 * property, value or importance, so these facts stay true for the record's
 * life.
 */
export class DeclarationRecord {
  /** @type {Declaration} the declaration the record describes */
  node;
  /** @type {string} the property name as written */
  prop;
  /** @type {string} the value as written */
  value;
  /** @type {boolean} whether the declaration is !important */
  important;
  /** @type {PropertyKeys} the keys of the property name */
  keys;
  /** @type {number} equal for declarations that print the same, within one run */
  id;

  /**
   * @param {Declaration} node
   * @param {string} prop
   * @param {string} value
   * @param {boolean} important
   * @param {PropertyKeys} keys
   * @param {number} id
   */
  constructor(node, prop, value, important, keys, id) {
    this.node = node;
    this.prop = prop;
    this.value = value;
    this.important = important;
    this.keys = keys;
    this.id = id;
  }
}

/**
 * The record of a declaration of the run's stylesheet.
 *
 * @param {Declaration} node
 * @param {PropertyTable} properties
 * @param {DeclarationKeys} declarations
 * @return {DeclarationRecord}
 */
export function recordDeclaration(node, properties, declarations) {
  return new DeclarationRecord(
    node,
    node.prop,
    node.value,
    node.important === true,
    properties.keysOf(node.prop),
    declarations.keyOf(node)
  );
}
