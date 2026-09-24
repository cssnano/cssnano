/**
 * @param {(value: string, index: number) => string} encoder
 */
export default function keyframesReducer(encoder: (value: string, index: number) => string): {
    collect(node: import("postcss/lib/node").AnyNode): void;
    transform(): void;
};
//# sourceMappingURL=keyframes.d.ts.map