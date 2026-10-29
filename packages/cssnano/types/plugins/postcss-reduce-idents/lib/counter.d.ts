import type { TextTable } from '../../../values/textTable.js';
/**
 * @param {(value: string, index: number) => string} encoder
 */
export default function counterReducer(encoder: (value: string, index: number) => string): {
    /** @param {import('postcss').AnyNode} node */ collect(node: import('postcss').AnyNode): void;
    /** @param {TextTable} table */
    transform(table: TextTable): void;
};
//# sourceMappingURL=counter.d.ts.map