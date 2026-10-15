/**
 * Synthetic output belongs to the normalization/serialization layer. Parsed
 * arena nodes contain source structure and semantic facts only.
 *
 * @typedef {{kind:'source',start:number,end:number}|{kind:'text',value:string}|{kind:'node',node:number}|{kind:'sequence',items:readonly Emit[]}} Emit
 */
export type Emit = {
    kind: 'source';
    start: number;
    end: number;
} | {
    kind: 'text';
    value: string;
} | {
    kind: 'node';
    node: number;
} | {
    kind: 'sequence';
    items: readonly Emit[];
};
export {};
//# sourceMappingURL=outputOverlay.d.ts.map