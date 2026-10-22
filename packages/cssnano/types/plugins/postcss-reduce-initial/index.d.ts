export type Options = {
    /**
     * Properties that keep their value, such as `min-height`. (default: none)
     */
    ignore?: string[];
};
export type Reducers = Map<string | null, Map<string | null, import('../../pipeline/host.js').Reducer>>;
/** @type {import('../../pipeline/host.js').StageDescriptor} */
declare const reduceInitial: import('../../pipeline/host.js').StageDescriptor;
export { reduceInitial as default };
//# sourceMappingURL=index.d.ts.map