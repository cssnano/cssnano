/** @import {PropertyKeys} from './propertyTable.js' */
/** @import {ArenaIndex} from '../merge/lib/rules/blockRecord.js' */
import { DECLARATION, NO_PRELUDE } from '../merge/lib/rules/blockRecord.js';

/**
 * One declaration of a merge run, with the facts its records keep.
 * Rule merging moves and removes declarations but never changes their
 * property, value or importance, so these facts stay true for the record's
 * life.
 */
export class DeclarationRecord {
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
  /** @type {ArenaIndex} the place of the record in the arena of a block's entries, -1 until added */
  index = /** @type {ArenaIndex} */ (-1);
  /** @type {typeof DECLARATION} DECLARATION, which the window reads with the other records */
  kind = DECLARATION;
  /** @type {string} '' for a declaration, which has no at-rule name */
  name = '';
  /** @type {string} '' for a declaration, which has no prelude */
  params = '';
  /** @type {boolean} false for a declaration, which is no layer */
  anonymous = false;
  /** @type {number} NO_PRELUDE for a declaration */
  preludeId = NO_PRELUDE;
  /** @type {string | null} the whitespace before the declaration, as its node gives it at the build */
  before = '';

  /**
   * @param {string} prop
   * @param {string} value
   * @param {boolean} important
   * @param {PropertyKeys} keys
   * @param {number} id
   */
  constructor(prop, value, important, keys, id) {
    this.prop = prop;
    this.value = value;
    this.important = important;
    this.keys = keys;
    this.id = id;
  }
}
