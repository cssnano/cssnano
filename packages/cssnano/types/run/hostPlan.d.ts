/** @import {HostMember, Merge, SymbolEntry} from './host.js' */
import type { HostMember, Merge, SymbolEntry } from './host.js';
export type TransformField = 'normalizeWhitespace' | 'discardOverridden' | 'discardEmpty' | 'uniqueSelectors' | 'normalizeCharset' | 'rawCache';
export type RunPlan = {
    /**
     * the stages of the run, in order
     */
    members: readonly HostMember[];
    /**
     * the merge, when it is on
     */
    merge: Merge | undefined;
    /**
     * the advanced transforms, in entry order
     */
    symbols: readonly SymbolEntry[];
    normalizeWhitespace: Record<PropertyKey, unknown> | undefined;
    discardOverridden: Record<PropertyKey, unknown> | undefined;
    discardEmpty: Record<PropertyKey, unknown> | undefined;
    uniqueSelectors: Record<PropertyKey, unknown> | undefined;
    normalizeCharset: Record<PropertyKey, unknown> | undefined;
    rawCache: Record<PropertyKey, unknown> | undefined;
    /**
     * whether the run checks its caches; the process default when undefined
     */
    consistencyChecks: boolean | undefined;
};
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
export declare function hostPlan(parts?: Partial<RunPlan>): RunPlan;
/**
 * Whether the plan has nothing to host. `consistencyChecks` does not count: it
 * only tunes a run that has something to do.
 *
 * @param {RunPlan} plan
 * @returns {boolean}
 */
export declare function isEmptyPlan(plan: RunPlan): boolean;
//# sourceMappingURL=hostPlan.d.ts.map