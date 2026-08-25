declare function stringify(nodes: any): any;
declare function parse(value: any): {
    nodes: any[];
    toString(): any;
};
declare function unit(value: any): false | {
    unit: string;
};
export { parse, stringify, unit };
//# sourceMappingURL=parse.d.ts.map
