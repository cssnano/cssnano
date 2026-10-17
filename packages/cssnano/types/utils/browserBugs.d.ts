import bugs from './data/bugs.json';
export type BugKey = keyof typeof bugs;
/**
 * Whether at least one target has the bug. The browsers come from bugs.json,
 * which lists each bug's affected browser entries. An empty list means the
 * targets are unknown, so they may have any bug.
 * @param {readonly string[]} targets browserslist entries such as "ie 11"
 * @param {BugKey} bug
 * @return {boolean}
 */
export declare function anyAffected(targets: readonly string[], bug: BugKey): boolean;
//# sourceMappingURL=browserBugs.d.ts.map