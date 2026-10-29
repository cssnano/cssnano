import type { Stage } from '../../pipeline/host.js';
export type Options = object;
/**
 * @typedef {object} Options
 */
/** @satisfies {StageEntry} */
declare const normalizeUnicode: {
    create: (options: Options, browsers: readonly string[] | undefined) => Stage;
};
export { normalizeUnicode as default };
//# sourceMappingURL=index.d.ts.map