import defaultBrowserslist from 'browserslist';

/** @import {TargetOptions} from './index.js' */
/** @import {Result} from 'postcss' */

/**
 * @typedef {((query: TargetOptions['overrideBrowserslist'], options: {stats?: TargetOptions['stats'], path?: string, env?: string}) => string[]) & {loadConfig: (options: {path?: string, env?: string}) => string | string[] | undefined}} Browserslist
 */

/**
 * The targets when the user states no preference: browsers that support
 * every Baseline widely available feature, plus the browsers built on their
 * engines.
 */
export const defaultTargetsQuery = 'baseline widely available with downstream';

/** One entry per Result, so the plugins of a preset share a file's targets. */
/** @type {WeakMap<Result, Map<string, readonly string[]>>} */
const cacheByResult = new WeakMap();
/**
 * One frozen copy per browserslist list. The copy is shared by every result
 * that resolves the list, so its support answers stay cached across files.
 * @type {WeakMap<readonly string[], readonly string[]>}
 */
const frozenByBrowserslistList = new WeakMap();
/** @type {WeakMap<object, number>} */
const statsIds = new WeakMap();
let nextStatsId = 0;

/** @param {Result} result @return {Map<string, readonly string[]>} */
function entriesFor(result) {
  let entries = cacheByResult.get(result);
  if (entries === undefined) {
    entries = new Map();
    cacheByResult.set(result, entries);
  }
  return entries;
}

/**
 * @param {readonly string[]} list browserslist's own array, which it may cache
 * @return {readonly string[]}
 */
function frozenCopyOf(list) {
  let frozen = frozenByBrowserslistList.get(list);
  if (frozen === undefined) {
    frozen = Object.freeze([...list]);
    frozenByBrowserslistList.set(list, frozen);
  }
  return frozen;
}

/**
 * Stats objects are keyed by identity, because serializing a large object on
 * every lookup would cost more than the browserslist call it saves.
 * @param {TargetOptions['stats']} stats
 * @return {string | number | null}
 */
function statsKey(stats) {
  if (typeof stats !== 'object' || stats === null) return stats ?? null;
  let id = statsIds.get(stats);
  if (id === undefined) {
    nextStatsId += 1;
    id = nextStatsId;
    statsIds.set(stats, id);
  }
  return id;
}

/**
 * Browserslist searches the config upwards from a file or a directory. A
 * browser, a partial process shim, or a deleted working directory (as in a
 * long-running watcher) has none to offer.
 * @return {string | undefined}
 */
function workingDirectory() {
  try {
    return globalThis.process?.cwd();
  } catch {
    return undefined;
  }
}

/**
 * An empty list keeps every support-dependent optimization off. Widening it
 * to other browsers would enable transforms that the query excluded.
 * @param {Result | undefined} result
 * @param {unknown} query
 */
function warnEmptyQuery(result, query) {
  result?.warn(
    `The browserslist query ${JSON.stringify(query)} matches no browser, so optimizations that depend on browser support are disabled.`,
    { plugin: 'cssnano' }
  );
}

/**
 * Resolves the targets for one plugin, with the same option precedence as
 * browserslist: plugin options win over the postcss options, and the override
 * query wins over the project config. Without either, the targets are the
 * default ones rather than browserslist's own `defaults`. A query that
 * matches no browser yields an empty list and a warning on the result.
 * Without a result there is no file to share with, so nothing is cached.
 * @param {TargetOptions} options
 * @param {Result | undefined} result
 * @param {Browserslist} [browserslist]
 * @return {readonly string[]}
 */
export function resolveTargets(
  options,
  result,
  browserslist = defaultBrowserslist
) {
  const resultOptions =
    /** @type {TargetOptions & {from?: string, file?: string}} */ (
      result?.opts || {}
    );
  const stats = options.stats || resultOptions.stats;
  const env = options.env || resultOptions.env;
  const path =
    options.path ||
    resultOptions.from ||
    resultOptions.file ||
    workingDirectory();
  const key = JSON.stringify([
    options.overrideBrowserslist ?? null,
    path,
    env ?? null,
    statsKey(stats),
  ]);

  const entries = result ? entriesFor(result) : undefined;
  let targets = entries?.get(key);
  if (targets === undefined) {
    const resolveOptions = { stats, path, env };
    const query =
      options.overrideBrowserslist ??
      browserslist.loadConfig({ path, env }) ??
      defaultTargetsQuery;
    // Browserslist caches its array, so other tools may hold it. Freezing that
    // array would break them; cssnano takes a frozen copy instead.
    targets = frozenCopyOf(browserslist(query, resolveOptions));
    // An empty list keeps support-dependent optimizations off, because widening
    // it would enable transforms that the query excluded.
    if (targets.length === 0) warnEmptyQuery(result, query);
    entries?.set(key, targets);
  }
  return targets;
}
