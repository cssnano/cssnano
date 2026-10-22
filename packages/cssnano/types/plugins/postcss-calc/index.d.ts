import type { PostCssCalcOptions } from 'postcss-calc';
import type { Stage } from '../../pipeline/host.js';
/** @satisfies {StageEntry} */
declare const calc: {
    create: (/** @type {PostCssCalcOptions} */ options: PostCssCalcOptions) => Stage;
};
export { calc as default };
//# sourceMappingURL=index.d.ts.map