import { isInvalidSelector } from './lib/isInvalidSelector.js';
import type { Stage } from '../../pipeline/host.js';
export type Options = {
    /**
     * Sorts the selectors of a list alphabetically. (default: true)
     */
    sort?: boolean;
    /**
     * Factors a shared prefix or suffix of a selector list into `:is()` when that is shorter and keeps the cascade. (default: true)
     */
    convertToIs?: boolean;
};
/** @satisfies {StageEntry} */
declare const minifySelectors: {
    create: (options: Record<PropertyKey, unknown>, targets: readonly string[] | undefined) => Stage;
};
export { minifySelectors as default, isInvalidSelector };
//# sourceMappingURL=index.d.ts.map