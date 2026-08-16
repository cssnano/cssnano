'use strict';
const valueParser = require('postcss-value-parser');
const { colorFunctions } = require('./spec.js');
const {
  substitutionFunctions,
  trustedSupportFunctions,
} = require('./unresolved.js');

/* Substitution functions prevent fallback detection because their values
 * are resolved at runtime, not statically analyzable. */
const unresolvableFunctions = substitutionFunctions;

/* rgb() and hsl() are so old that all user agents support them; an author
 * would not write a fallback for them. */
const originalColorFunctions = new Set(['rgb', 'hsl']);

/* CSS Color 3 introduced rgba() and hsla(). */
const colorLevel3Functions = new Set(['rgb', 'rgba', 'hsl', 'hsla']);

/* Ubiquitous functions like rgba() and calc() are so widely supported that
 * authors rarely write fallbacks for them. Blocking merges for these would
 * refuse most stylesheets. */
const ubiquitousFunctions = new Set([...colorLevel3Functions, 'calc']);

/**
 * Functions whose support determines whether a user agent accepts or rejects
 * the declaration; authors write fallbacks for these because browserlist
 * cannot determine support automatically.
 */
const conditionalSupportFunctions = colorFunctions
  .difference(originalColorFunctions)
  .union(trustedSupportFunctions);

/**
 * All functions that block a merge or clone: unresolvable functions and
 * conditionally-supported functions.
 */
const supportDependentFunctions = new Set([
  ...unresolvableFunctions,
  ...conditionalSupportFunctions,
]);

/**
 * The support-dependent functions that block a merge. This excludes
 * ubiquitous functions like `rgba()` and `calc()` that stylesheets use
 * without fallbacks.
 */
const mergeSensitiveFunctions = new Set([
  ...unresolvableFunctions,
  ...conditionalSupportFunctions.difference(ubiquitousFunctions),
]);

/**
 * @param {string} value
 * @return {Set<string>} the support-dependent functions the value calls
 */
function supportDependenciesIn(value) {
  /** @type {Set<string>} */
  const names = new Set();

  valueParser(value).walk((node) => {
    if (node.type !== 'function') {
      return;
    }

    const name = node.value.toLowerCase();

    if (supportDependentFunctions.has(name)) {
      names.add(name);
    }
  });

  return names;
}

/**
 * Recording support when cloning declarations preserves which support the
 * original declaration required, which values alone cannot recover.
 *
 * @type {WeakMap<import('postcss').Declaration, Set<string>>}
 */
const inheritedSupport = new WeakMap();

/**
 * @param {import('postcss').Declaration} declaration
 * @return {Set<string>} every function a browser had to support for the
 * declaration to apply: the ones its value calls, and the ones the declaration
 * it was cloned from needed
 */
function requiredSupport(declaration) {
  const own = supportDependenciesIn(declaration.value);
  const inherited = inheritedSupport.get(declaration);

  return inherited === undefined ? own : own.union(inherited);
}

/**
 * @param {import('postcss').Declaration} source
 * @param {import('postcss').Declaration} clone taken from source
 * @return {void}
 */
function inheritSupport(source, clone) {
  inheritedSupport.set(clone, requiredSupport(source));
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
 * @return {Set<string>} the support out of `requiredSupport` that stops a
 * merge
 */
function mergeBlockingSupport(declaration) {
  return requiredSupport(declaration).intersection(mergeSensitiveFunctions);
}

/**
 * A later declaration requiring new support is assumed to enhance an earlier
 * one. Dropping the earlier changes rendering.
 *
 * @param {import('postcss').Declaration} earlier
 * @param {import('postcss').Declaration} later
 * @return {boolean} whether earlier is a fallback for later
 */
function isFallback(earlier, later) {
  return !requiredSupport(later).isSubsetOf(requiredSupport(earlier));
}

/**
 * Author-written declarations are checked against all support-dependent
 * functions; plugin-created declarations only against the merge-sensitive
 * ones.
 *
 * @param {import('postcss').Declaration} earlier
 * @param {import('postcss').Declaration} later
 * @return {boolean}
 */
function strandsFallback(earlier, later) {
  if (!isDerived(earlier)) {
    return isFallback(earlier, later);
  }

  return !mergeBlockingSupport(later).isSubsetOf(mergeBlockingSupport(earlier));
}

module.exports = {
  requiredSupport,
  mergeBlockingSupport,
  inheritSupport,
  isFallback,
  strandsFallback,
};
