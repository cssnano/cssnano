import type { CSSToken } from '@csstools/css-tokenizer';
import type { Stage } from '../../pipeline/host.js';
import type { ValueBuffer } from '../../values/valueBuffer.js';
export type Structure = NonNullable<ReturnType<ValueBuffer['structure']>>;
export type Side = {
    axis: 'x' | 'y' | 'center';
    offset: () => CSSToken;
};
export type PositionTerm = {
    start: number;
    end: number;
    side: Side | undefined;
};
export type Edit = {
    start: number;
    end: number;
    replacement: CSSToken[];
};
/** @satisfies {StageEntry} */
declare const normalizePositions: {
    create: () => Stage;
};
export { normalizePositions as default };
//# sourceMappingURL=index.d.ts.map