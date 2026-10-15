import bugs from './data/bugs.json' with { type: 'json' };

/** @typedef {keyof typeof bugs} BugKey */

/** @type {Map<string, Set<string>>} */
const affectedByBug = new Map(
  Object.entries(bugs).map(([key, bug]) => [key, new Set(bug.browsers)])
);

/** @type {Map<string, readonly string[]>} */
const browsersByBug = new Map(
  Object.entries(bugs).map(([key, bug]) => [
    key,
    Object.freeze([...bug.browsers]),
  ])
);

/**
 * @template T
 * @param {Map<string, T>} entries
 * @param {BugKey} bug
 * @return {T}
 */
function entryFor(entries, bug) {
  const entry = entries.get(bug);
  if (entry === undefined) {
    throw new RangeError(`Unknown browser bug key: ${bug}`);
  }
  return entry;
}

/**
 * Whether at least one target has the bug. The browsers come from bugs.json,
 * which lists each bug's affected browser entries. An empty list means the
 * targets are unknown, so they may have any bug.
 * @param {readonly string[]} targets browserslist entries such as "ie 8"
 * @param {BugKey} bug
 * @return {boolean}
 */
export function anyAffected(targets, bug) {
  const affected = entryFor(affectedByBug, bug);
  if (targets.length === 0) return true;
  for (const target of targets) {
    if (affected.has(target)) return true;
  }
  return false;
}

/**
 * The browser entries that a bug affects, in bugs.json order. The list is
 * frozen and built once per bug, so a caller cannot change the bug data.
 * @param {BugKey} bug
 * @return {readonly string[]}
 */
export function browsersAffectedBy(bug) {
  return entryFor(browsersByBug, bug);
}
