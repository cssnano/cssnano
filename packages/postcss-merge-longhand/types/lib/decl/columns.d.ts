import type { Container, Declaration } from 'postcss';
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
 * @param {Container} rule
 * @param {Declaration[]} [declarations]
 * @param {[Declaration[], Declaration[]]} [lanes]
 */
export declare function reduceColumns(rule: Container, declarations?: Declaration[], lanes?: [Declaration[], Declaration[]]): void;
//# sourceMappingURL=columns.d.ts.map