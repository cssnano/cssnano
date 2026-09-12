import type { Declaration, Rule } from 'postcss';
export declare const allColumnProps: Set<string>;
/**
 * Check if a declaration sets column properties beyond column-width/count.
 * The `columns: <width> / <height>` form sets column-height via top-level slash.
 *
 * @param {Declaration} declaration
 * @return {boolean}
 */
export declare const setsOtherColumnProperty: (declaration: Declaration) => boolean;
/**
 * @param {Rule} rule
 * @param {Declaration[]} [declarations]
 */
export declare function reduceColumns(rule: Rule, declarations?: Declaration[]): void;
//# sourceMappingURL=columns.d.ts.map