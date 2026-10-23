import type { Stage } from '../../pipeline/host.js';
export type Options = object;
/** @satisfies {StageEntry} */
declare const minifyParams: {
    create: (_options: Options, targets: readonly string[] | undefined) => Stage;
};
export { minifyParams as default };
//# sourceMappingURL=index.d.ts.map