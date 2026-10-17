import defaultBrowserslist from 'browserslist';
import { agents } from 'caniuse-lite/dist/unpacker/agents.js';
import { reportIgnoredTargetOptions } from './ignoredTargetOptions.js';
import { versionSeparator } from './versions.js';

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
 * How many distinct target lists keep a shared copy. A build uses one or a
 * few; the bound keeps a long-running process that receives many queries
 * from holding every list it has seen.
 */
export const sharedTargetListLimit = 500;
/**
 * One frozen copy per distinct list of targets, least recently used first.
 * Browserslist returns a new array when its cache is disabled, evicted, or
 * path-dependent, so the copy is found by content; the shared identity keeps
 * the support answers once per list rather than once per file.
 * @type {Map<string, readonly string[]>}
 */
const frozenByContent = new Map();
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
  const content = list.join(',');
  let frozen = frozenByContent.get(content);
  if (frozen === undefined) {
    frozen = Object.freeze([...list]);
    if (frozenByContent.size >= sharedTargetListLimit) {
      frozenByContent.delete(frozenByContent.keys().next().value ?? '');
    }
  } else {
    // Move the list to the most recently used end.
    frozenByContent.delete(content);
  }
  frozenByContent.set(content, frozen);
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

/** @type {Map<string, Set<string | null> | undefined>} */
const versionsByBrowser = new Map();

/**
 * Engines that browserslist resolves from its own data, not from caniuse.
 * @type {ReadonlySet<string>}
 */
const enginesWithoutCaniuseData = new Set(['node', 'electron']);

/**
 * @param {string} browser
 * @return {Set<string | null> | undefined} undefined for a browser that caniuse-lite does not list
 */
function listedVersions(browser) {
  if (!versionsByBrowser.has(browser)) {
    versionsByBrowser.set(
      browser,
      Object.hasOwn(agents, browser)
        ? new Set(agents[browser].versions)
        : undefined
    );
  }
  return versionsByBrowser.get(browser);
}

/** @type {WeakMap<readonly string[], readonly string[]>} */
const missingByTargets = new WeakMap();

/**
 * Targets that the installed caniuse-lite lacks, either a version of a
 * browser it lists or a whole browser. That happens when browserslist
 * resolves targets from a newer caniuse-lite than the one cssnano uses; every
 * feature then counts as unsupported for them. Every file of a build shares
 * the frozen list, so the scan runs once per list.
 * @param {readonly string[]} targets a frozen list of browserslist entries
 * @return {readonly string[]}
 */
function targetsMissingFromCaniuse(targets) {
  let missing = missingByTargets.get(targets);
  if (missing === undefined) {
    missing = findTargetsMissingFromCaniuse(targets);
    missingByTargets.set(targets, missing);
  }
  return missing;
}

/**
 * @param {readonly string[]} targets browserslist entries such as "safari 26.5"
 * @return {string[]}
 */
function findTargetsMissingFromCaniuse(targets) {
  return targets.filter((target) => {
    const separator = versionSeparator(target);
    const version = target.slice(separator + 1);
    if (version === '') return false;
    const browser = target.slice(0, separator);
    if (enginesWithoutCaniuseData.has(browser)) return false;
    const versions = listedVersions(browser);
    return versions === undefined || !versions.has(version);
  });
}

/**
 * @param {Result | undefined} result
 * @param {readonly string[]} targets
 */
function warnMissingFromCaniuse(result, targets) {
  if (result === undefined) return;
  const missing = targetsMissingFromCaniuse(targets);
  if (missing.length === 0) return;
  result.warn(
    `The installed caniuse-lite does not list ${missing.join(', ')}, which browserslist resolved from a newer copy, so optimizations that depend on browser support treat them as unsupported. Update caniuse-lite so the copies match.`,
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
  // In a preset, the options hold the preset's targets, which replaced any
  // the user set on the plugin.
  reportIgnoredTargetOptions(options, result);
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
    else warnMissingFromCaniuse(result, targets);
    entries?.set(key, targets);
  }
  return targets;
}
