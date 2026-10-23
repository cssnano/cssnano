import defaultBrowserslist from 'browserslist';
import { agents } from 'caniuse-lite/dist/unpacker/agents.js';
import { versionSeparator } from './versions.js';
import workingDirectory from './workingDirectory.js';

/** @import {Result} from 'postcss' */

/**
 * The browser targets a preset gives every target-reading plugin. The fields
 * are the options of browserslist; an unset one is left to browserslist.
 * @typedef {object} SharedTargets
 * @property {string | string[]} [query] the positional queries of browserslist
 * @property {string} [env]
 * @property {string | Record<string, Record<string, number>> | {dataByBrowser: Record<string, Record<string, number>>}} [stats]
 * @property {string} [path] the directory to search for the config, default the PostCSS from
 * @property {string} [config] the config file to read instead of the one found
 * @property {boolean} [ignoreUnknownVersions]
 * @property {boolean} [mobileToDesktop]
 * @property {boolean} [throwOnMissing]
 */

/**
 * The options of a plugin that reads the browser targets. Only a preset sets
 * browserTargets, so a plugin that runs alone has none and uses the defaults.
 * @typedef {{[browserTargets]?: SharedTargets}} TargetOptions
 */

/**
 * @typedef {((query: SharedTargets['query'], options: Omit<SharedTargets, 'query'>) => string[]) & {loadConfig: (options: Pick<SharedTargets, 'path' | 'env' | 'config'>) => string | string[] | undefined}} Browserslist
 */

/**
 * Key under which a preset gives every target-reading plugin the browser
 * targets it was configured with. A symbol keeps them out of the plugin
 * options a user writes, so only a preset can set them.
 */
export const browserTargets = Symbol('cssnano.browserTargets');

/**
 * The targets when the user states no preference: browsers that support
 * every Baseline widely available feature, plus the browsers built on their
 * engines.
 */
export const defaultTargetsQuery = 'baseline widely available with downstream';

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
 * The directory that browserslist searches for a config: the browserslist path,
 * else the PostCSS from or file, else the working directory.
 * @param {SharedTargets | undefined} shared
 * @param {{from?: string, file?: string}} resultOptions
 * @return {string | undefined} undefined where there is no working directory
 */
function searchPathOf(shared, resultOptions) {
  return (
    shared?.path ??
    (resultOptions.from || resultOptions.file || workingDirectory())
  );
}

/**
 * Resolves the targets for one plugin. The preset's targets are the only ones
 * a plugin takes, and the query wins over the project config. The config is
 * searched from the browserslist `path`, else the PostCSS `from` option, and
 * read from the browserslist `config` when that is set. Without a query, the
 * targets are the default ones rather than browserslist's own `defaults`. A
 * query that matches no browser yields an empty list and a warning on the
 * result. Each call resolves again; a host plugin resolves once per file.
 * @param {object} options the plugin options, which may hold a preset's targets
 * @param {Result | undefined} result
 * @param {Browserslist} [browserslist]
 * @return {readonly string[]}
 */
export function resolveTargets(
  options,
  result,
  // browserslist unwraps dataByBrowser at runtime, which its own types omit.
  browserslist = /** @type {Browserslist} */ (defaultBrowserslist)
) {
  const resultOptions =
    /** @type {{env?: string, stats?: SharedTargets['stats'], from?: string, file?: string}} */ (
      result?.opts || {}
    );
  const shared = /** @type {TargetOptions} */ (options)[browserTargets];
  const query = shared?.query;
  const config = shared?.config;
  // The preset's env and stats win over the result's.
  const env = shared?.env ?? resultOptions.env;
  const stats = shared?.stats ?? resultOptions.stats;
  const path = searchPathOf(shared, resultOptions);
  const resolveOptions = {
    env,
    stats,
    path,
    config,
    ignoreUnknownVersions: shared?.ignoreUnknownVersions,
    mobileToDesktop: shared?.mobileToDesktop,
    throwOnMissing: shared?.throwOnMissing,
  };
  const resolvedQuery =
    query ??
    browserslist.loadConfig({ path, env, config }) ??
    defaultTargetsQuery;
  // Browserslist caches its array, so other tools may hold it. Freezing that
  // array would break them; cssnano takes a frozen copy instead.
  const targets = frozenCopyOf(browserslist(resolvedQuery, resolveOptions));
  // An empty list keeps support-dependent optimizations off, because widening
  // it would enable transforms that the query excluded.
  if (targets.length === 0) warnEmptyQuery(result, resolvedQuery);
  else warnMissingFromCaniuse(result, targets);
  return targets;
}
