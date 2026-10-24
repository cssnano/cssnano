import type { ValueBuffer } from '../../values/valueBuffer.js';
export type BalancedTokens = NonNullable<ReturnType<ValueBuffer['structure']>>;
/** @satisfies {import('../../pipeline/host.js').StageEntry} */
declare const normalizeTimingFunctions: {
    create: () => import("../../pipeline/host.js").Stage;
};
export { normalizeTimingFunctions as default };
//# sourceMappingURL=index.d.ts.map