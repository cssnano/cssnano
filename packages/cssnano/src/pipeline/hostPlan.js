/** @import {HostMember, Merge, SymbolEntry} from './host.js' */

/**
 * The whole-stylesheet transforms that a plan can turn on, one field each. A
 * field is the options its transform runs with, or undefined when it is off.
 * @typedef {'normalizeWhitespace' | 'discardOverridden' | 'discardEmpty' | 'uniqueSelectors' | 'normalizeCharset' | 'rawCache'} TransformField
 */

/**
 * What one host runs: its stages, its merge, its advanced transforms and its
 * whole-stylesheet transforms. The builder fills it once per preset call, and
 * the host reads it by field.
 *
 * @typedef {object} RunPlan
 * @property {readonly HostMember[]} members the stages of the run, in order
 * @property {Merge | undefined} merge the merge, when it is on
 * @property {readonly SymbolEntry[]} symbols the advanced transforms, in entry order
 * @property {Record<PropertyKey, unknown> | undefined} normalizeWhitespace
 * @property {Record<PropertyKey, unknown> | undefined} discardOverridden
 * @property {Record<PropertyKey, unknown> | undefined} discardEmpty
 * @property {Record<PropertyKey, unknown> | undefined} uniqueSelectors
 * @property {Record<PropertyKey, unknown> | undefined} normalizeCharset
 * @property {Record<PropertyKey, unknown> | undefined} rawCache
 * @property {boolean | undefined} consistencyChecks whether the run checks its caches; the process default when undefined
 */

/**
 * A plan with every field defaulted, so that `parts` names only the fields a run
 * sets.
 *
 * @param {Partial<RunPlan>} [parts]
 * @returns {RunPlan}
 */
export function hostPlan(parts = {}) {
  return {
    members: [],
    merge: undefined,
    symbols: [],
    normalizeWhitespace: undefined,
    discardOverridden: undefined,
    discardEmpty: undefined,
    uniqueSelectors: undefined,
    normalizeCharset: undefined,
    rawCache: undefined,
    consistencyChecks: undefined,
    ...parts,
  };
}

/**
 * Whether the plan has nothing to host. `consistencyChecks` does not count: it
 * only tunes a run that has something to do.
 *
 * @param {RunPlan} plan
 * @returns {boolean}
 */
export function isEmptyPlan(plan) {
  return (
    plan.members.length === 0 &&
    plan.symbols.length === 0 &&
    plan.merge === undefined &&
    plan.normalizeWhitespace === undefined &&
    plan.discardOverridden === undefined &&
    plan.discardEmpty === undefined &&
    plan.uniqueSelectors === undefined &&
    plan.normalizeCharset === undefined &&
    plan.rawCache === undefined
  );
}
