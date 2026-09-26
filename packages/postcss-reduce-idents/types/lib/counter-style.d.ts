/**
 * @param {(value: string, index: number) => string} encoder
 */
export default function counterStyleReducer(encoder: (value: string, index: number) => string): {
    collect(node: import("postcss/lib/node").AnyNode): void;
    transform(): void;
};
//# sourceMappingURL=counter-style.d.ts.map