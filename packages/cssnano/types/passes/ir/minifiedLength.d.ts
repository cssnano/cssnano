/**
 * The bytes a declaration takes in minified output: its name, its value, the
 * colon and the separator after it. `!important` adds ten bytes.
 *
 * @param {{prop: string, value: string, important?: boolean}} declaration a
 * PostCSS declaration, or a declaration record, which holds the same facts
 * @return {number}
 */
export declare function minifiedLength(declaration: {
    prop: string;
    value: string;
    important?: boolean;
}): number;
//# sourceMappingURL=minifiedLength.d.ts.map