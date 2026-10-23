import type { Stage } from '../../pipeline/host.js';
export type Options = {
    /**
     * The quote to prefer for strings. (default: 'double')
     */
    preferredQuote?: 'double' | 'single';
};
/** @satisfies {StageEntry} */
declare const stringEntry: {
    create: (/** @type {Options} */ options: Options) => Stage;
};
export { stringEntry as default };
//# sourceMappingURL=index.d.ts.map