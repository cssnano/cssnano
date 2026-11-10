import { blocksMerge, supportDependenciesOf } from './syntaxFeatures.js';

/** @import {TextTable} from '../../../../values/textTable.js' */

const EMPTY_SET = new Set();

/**
 * Recording support when cloning declarations preserves which support the
 * original declaration required, which values alone cannot recover.
 *
 * @type {WeakMap<import('postcss').Declaration, Set<string>>}
 */
const inheritedSupport = new WeakMap();

/**
 * @param {import('postcss').Declaration} declaration
 * @param {TextTable} textTable
 * @return {Set<string>} every feature a browser had to support for the
 * declaration to apply: the ones its value uses, and the ones the declaration
 * it was cloned from needed
 */
function requiredSupport(declaration, textTable) {
  const inherited = inheritedSupport.get(declaration);
  const own = supportDependenciesOf(declaration, textTable);
  return inherited === undefined ? own : own.union(inherited);
}

/**
 * @param {import('postcss').Declaration} source
 * @param {import('postcss').Declaration} clone taken from source
 * @param {TextTable} textTable
 * @return {void}
 */
function inheritSupport(source, clone, textTable) {
  inheritedSupport.set(clone, requiredSupport(source, textTable));
}

/**
 * inheritedSupport is populated only by inheritSupport(), which records each
 * declaration the plugin clones. A declaration's presence proves it was
 * synthesized by the plugin. Values the plugin invented, such as `currentcolor`
 * standing for `border: medium none`, cannot be fallbacks the author wrote.
 *
 * @param {import('postcss').Declaration} declaration
 * @return {boolean} whether the plugin created the declaration
 */
function isDerived(declaration) {
  return inheritedSupport.has(declaration);
}

/**
 * @param {import('postcss').Declaration} declaration
 * @param {TextTable} textTable
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {boolean} whether some target may drop the declaration because it
 * lacks syntax the declaration needs
 */
function needsUnmetSupport(declaration, textTable, features) {
  for (const feature of requiredSupport(declaration, textTable)) {
    if (!features.has(feature)) return true;
  }
  return false;
}

/**
 * @param {import('postcss').Declaration} declaration
 * @param {TextTable} textTable
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {Set<string>} the support out of `requiredSupport` that stops a
 * merge
 */
function mergeBlockingSupport(declaration, textTable, features) {
  /** @type {Set<string> | undefined} */
  let blocking;
  for (const feature of requiredSupport(declaration, textTable)) {
    if (blocksMerge(feature) && !features.has(feature)) {
      blocking ??= new Set();
      blocking.add(feature);
    }
  }
  return blocking ?? EMPTY_SET;
}

/**
 * A later declaration requiring new support is assumed to enhance an earlier
 * one. Dropping the earlier changes rendering.
 *
 * @param {import('postcss').Declaration} earlier
 * @param {import('postcss').Declaration} later
 * @param {TextTable} textTable
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {boolean} whether earlier is a fallback for later
 */
function isFallback(earlier, later, textTable, features) {
  const needed = requiredSupport(later, textTable);
  if (needed.size === 0) return false;
  const available = requiredSupport(earlier, textTable);
  for (const feature of needed) {
    if (!available.has(feature) && !features.has(feature)) return true;
  }
  return false;
}

/**
 * Author-written declarations are checked against all required support;
 * plugin-created declarations only against the features that block a merge.
 *
 * @param {import('postcss').Declaration} earlier
 * @param {import('postcss').Declaration} later
 * @param {TextTable} textTable
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {boolean}
 */
function strandsFallback(earlier, later, textTable, features) {
  if (!isDerived(earlier)) {
    return isFallback(earlier, later, textTable, features);
  }

  return !mergeBlockingSupport(later, textTable, features).isSubsetOf(
    mergeBlockingSupport(earlier, textTable, features)
  );
}

export {
  requiredSupport,
  mergeBlockingSupport,
  needsUnmetSupport,
  inheritSupport,
  isDerived,
  isFallback,
  strandsFallback,
};
