export type Node = {
    type: string;
    value: string;
    nodes?: Node[];
    walk?: Function;
    toString: Function;
};
/**
 * A deliberately small compatibility tree for the reducer modules. It keeps
 * the old node contracts used by this package while CSSTools owns parsing.
 * @typedef {{type: string, value: string, nodes?: Node[], walk?: Function, toString: Function}} Node
 */
/** @param {string} value @return {{nodes: Node[], walk: Function, toString: Function}} */
export default function parse(value: string): {
    nodes: Node[];
    walk: Function;
    toString: Function;
};
/** @param {string} value @return {false | {value: number, unit: string}} */
export declare function unit(value: string): false | {
    value: number;
    unit: string;
};
//# sourceMappingURL=parse.d.ts.map