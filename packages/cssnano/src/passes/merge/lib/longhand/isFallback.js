import {
  blocksMerge,
  longstandingFeatures,
  supportDependenciesIn,
} from './syntaxFeatures.js';

const EMPTY_SET = new Set();

/**
 * The newer syntax every browserslist target parses. OnceExit is synchronous,
 * so the file being processed is the only one that can observe this binding.
 * The default assumes targets at the support floor and nothing newer, which
 * keeps direct callers strict.
 *
 * @type {ReadonlySet<string>}
 */
let targetSupport = longstandingFeatures;

/**
 * @template T
 * @param {ReadonlySet<string>} supported - features every target supports
 * @param {() => T} run
 * @return {T}
 */
function withTargetSupport(supported, run) {
  const previous = targetSupport;
  targetSupport = supported;
  try {
    return run();
  } finally {
    targetSupport = previous;
  }
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
 * @return {Set<string>} every feature a browser had to support for the
 * declaration to apply: the ones its value uses, and the ones the declaration
 * it was cloned from needed
 */
function requiredSupport(declaration) {
  const inherited = inheritedSupport.get(declaration);
  const own = supportDependenciesIn(declaration.value);
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
 * @return {boolean} whether some target may drop the declaration because it
 * lacks syntax the declaration needs
 */
function needsUnmetSupport(declaration) {
  for (const feature of requiredSupport(declaration)) {
    if (!targetSupport.has(feature)) return true;
  }
  return false;
}

/**
 * @param {import('postcss').Declaration} declaration
 * @return {Set<string>} the support out of `requiredSupport` that stops a
 * merge
 */
function mergeBlockingSupport(declaration) {
  /** @type {Set<string> | undefined} */
  let blocking;
  for (const feature of requiredSupport(declaration)) {
    if (blocksMerge(feature) && !targetSupport.has(feature)) {
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
 * @return {boolean} whether earlier is a fallback for later
 */
function isFallback(earlier, later) {
  const needed = requiredSupport(later);
  if (needed.size === 0) return false;
  const available = requiredSupport(earlier);
  for (const feature of needed) {
    if (!available.has(feature) && !targetSupport.has(feature)) return true;
  }
  return false;
}

/**
 * Author-written declarations are checked against all required support;
 * plugin-created declarations only against the features that block a merge.
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

export {
  requiredSupport,
  mergeBlockingSupport,
  needsUnmetSupport,
  inheritSupport,
  isFallback,
  strandsFallback,
  withTargetSupport,
};
