export type Options = {
    /**
     * Properties that keep their value, such as `min-height`. (default: none)
     */
    ignore?: string[];
};
export type Reducers = Map<string | null, Map<string | null, import('../../pipeline/host.js').Reducer>>;
/**
 * Compiles the properties to leave alone. The stage does nothing when a
 * browser target lacks the `initial` keyword.
 *
 * @param {Options} options
 * @param {readonly string[] | undefined} browsers
 * @return {import('../../pipeline/host.js').Stage | null}
 */
declare function compileReduceInitial(options: Options, browsers: readonly string[] | undefined): import('../../pipeline/host.js').Stage | null;
/** @satisfies {import('../../pipeline/host.js').StageEntry} */
declare const reduceInitial: {
    create: typeof compileReduceInitial;
};
export { reduceInitial as default };
//# sourceMappingURL=index.d.ts.map