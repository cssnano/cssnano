/**
 * @param {(value: string, index: number) => string} encoder
 */
export default function counterStyleReducer(encoder: (value: string, index: number) => string): {
    collect(node: import("postcss/lib/node").AnyNode, table: import("../../../values/textTable.js").TextTable): void;
    transform(table: import("../../../values/textTable.js").TextTable): void;
};
//# sourceMappingURL=counter-style.d.ts.map