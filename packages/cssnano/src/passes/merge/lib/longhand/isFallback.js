import {
  blocksMerge,
  supportDependenciesOf,
} from '../../../ir/syntaxFeatures.js';

/** @import {DeclarationItem} from './blockDeclarations.js' */

const EMPTY_SET = new Set();

/**
 * @param {DeclarationItem} declaration
 * @return {Set<string>} every feature a browser had to support for the
 * declaration to apply: the ones its value uses, and the ones the declaration
 * it was cloned from needed
 */
function requiredSupport(declaration) {
  const own = supportDependenciesOf(declaration);
  return declaration.inheritedSupport === null
    ? own
    : own.union(declaration.inheritedSupport);
}

/**
 * A declaration the plugin cloned carries its own support requirement, which
 * values alone cannot recover. An author-written declaration has none, so its
 * presence tells that the plugin created the declaration. Values the plugin
 * invented, such as `currentcolor` standing for `border: medium none`, cannot
 * be fallbacks the author wrote.
 *
 * @param {DeclarationItem} declaration
 * @return {boolean} whether the plugin created the declaration
 */
function isDerived(declaration) {
  return declaration.inheritedSupport !== null;
}

/**
 * @param {DeclarationItem} declaration
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {boolean} whether some target may drop the declaration because it
 * lacks syntax the declaration needs
 */
function needsUnmetSupport(declaration, features) {
  for (const feature of requiredSupport(declaration)) {
    if (!features.has(feature)) return true;
  }
  return false;
}

/**
 * @param {DeclarationItem} declaration
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {Set<string>} the support out of `requiredSupport` that stops a
 * merge
 */
function mergeBlockingSupport(declaration, features) {
  /** @type {Set<string> | undefined} */
  let blocking;
  for (const feature of requiredSupport(declaration)) {
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
 * @param {DeclarationItem} earlier
 * @param {DeclarationItem} later
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {boolean} whether earlier is a fallback for later
 */
function isFallback(earlier, later, features) {
  const needed = requiredSupport(later);
  if (needed.size === 0) return false;
  const available = requiredSupport(earlier);
  for (const feature of needed) {
    if (!available.has(feature) && !features.has(feature)) return true;
  }
  return false;
}

/**
 * Author-written declarations are checked against all required support;
 * plugin-created declarations only against the features that block a merge.
 *
 * @param {DeclarationItem} earlier
 * @param {DeclarationItem} later
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {boolean}
 */
function strandsFallback(earlier, later, features) {
  if (!isDerived(earlier)) {
    return isFallback(earlier, later, features);
  }

  return !mergeBlockingSupport(later, features).isSubsetOf(
    mergeBlockingSupport(earlier, features)
  );
}

export {
  requiredSupport,
  mergeBlockingSupport,
  needsUnmetSupport,
  isFallback,
  strandsFallback,
};
