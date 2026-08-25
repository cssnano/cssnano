/** @param {unknown[]} nodes */
declare function stringify(nodes: unknown[]): any;
/** @param {string} value */
declare function unit(value: string): false | {
    number: string;
    unit: string;
};
/** @param {string} value */
declare function parse(value: string): {
    nodes: any[];
    walk(callback: any): /*elided*/ any;
    toString(): any;
};
export { parse, stringify, unit };
//# sourceMappingURL=parse.d.ts.map