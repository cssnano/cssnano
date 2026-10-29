import type { Declaration } from 'postcss';
/**
 * Drops declarations that later ones override on every side in every
 * `writing-mode` and `direction`, since flow-relative and physical properties
 * alias each other. A later declaration does not count when the earlier is
 * its fallback, or when some target understands the earlier but not the later.
 *
 * @param {Declaration[]} lane - one importance lane of a group in source
 * order; barriers that belong to no family are skipped
 * @param {import('../targetSupport.js').BoxSupport} support
 * @param {import('../../../../../values/textTable.js').TextTable} textTable
 * @return {void}
 */
export declare function discardDeadDeclarations(lane: Declaration[], support: import('../targetSupport.js').BoxSupport, textTable: import('../../../../../values/textTable.js').TextTable): void;
//# sourceMappingURL=crossKindCoverage.d.ts.map