import type { Stage } from '../../pipeline/host.js';
export type Options = import('./lib/findReplacements.js').Options;
/**
 * The stage for one run. It converts the lengths, times, angles and frequencies
 * of every property it does not skip, with the target support for IE zero units.
 *
 * @param {Options} options
 * @param {readonly string[] | undefined} browsers
 * @return {Stage}
 */
declare function compileConvertValues(options: Options, browsers: readonly string[] | undefined): Stage;
/** @satisfies {StageEntry} */
declare const convertValues: {
    create: typeof compileConvertValues;
};
export { convertValues as default };
//# sourceMappingURL=index.d.ts.map