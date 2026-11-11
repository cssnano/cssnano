/** @import {PropertyKeys} from './propertyTable.js' */
/** @import {ArenaIndex} from '../merge/lib/rules/blockRecord.js' */
import { DECLARATION } from '../merge/lib/rules/blockRecord.js';

/**
 * One declaration of a merge run, with the facts its records keep.
 * Rule merging moves and removes declarations but never changes their
 * property, value or importance, so these facts stay true for the record's
 * life.
 */
export class DeclarationRecord {
  /** @type {typeof DECLARATION} DECLARATION, which the window reads with the other records */
  kind = DECLARATION;
  /** @type {ArenaIndex} the place of the record in the arena of a block's entries, -1 until added */
  index = /** @type {ArenaIndex} */ (-1);
  /** @type {string | null} the whitespace before the declaration, as its node gives it at the build */
  before;
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
   * The text between the property and the value, as the node's raws give it,
   * or null when the node has none and the printer infers it.
   *
   * @type {string | null}
   */
  between;
  /**
   * The spelling of the important flag as the node's raws give it, or null when
   * the declaration is not important or the printer infers the flag.
   *
   * @type {string | null}
   */
  importantSpelling;
  /**
   * The features a browser must support for the declaration to apply, when the
   * merge derived it from another declaration. Null for a declaration the
   * author wrote.
   *
   * @type {ReadonlySet<string> | null}
   */
  inheritedSupport = null;
  /**
   * Whether an edit changed the declaration, so write-back must write it. The
   * build sets nothing.
   *
   * @type {boolean}
   */
  marked = false;

  /**
   * The arena index of the record whose raws a merged entry prints, or -1 for
   * an entry that keeps its own raws. Every record shape holds it.
   *
   * @type {number}
   */
  template = -1;

  /**
   * @param {string | null} before
   * @param {string} prop
   * @param {string} value
   * @param {boolean} important
   * @param {PropertyKeys} keys
   * @param {number} id
   * @param {string | null} between
   * @param {string | null} importantSpelling
   */
  constructor(
    before,
    prop,
    value,
    important,
    keys,
    id,
    between,
    importantSpelling
  ) {
    this.before = before;
    this.prop = prop;
    this.value = value;
    this.important = important;
    this.keys = keys;
    this.id = id;
    this.between = between;
    this.importantSpelling = importantSpelling;
  }
}
