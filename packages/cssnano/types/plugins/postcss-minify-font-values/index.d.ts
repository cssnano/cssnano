import type { Stage } from '../../pipeline/host.js';
export type Options = {
    /**
     * Removes the font families that follow a font keyword, such as `sans-serif`. (default: false)
     */
    removeAfterKeyword?: boolean;
    /**
     * Removes duplicated font families. (default: true)
     */
    removeDuplicates?: boolean;
    /**
     * Removes quotes from font families. A function chooses the property to change for each one. (default: true)
     */
    removeQuotes?: boolean | ((prop: string) => '' | 'font' | 'font-family' | 'font-weight');
};
/** @satisfies {StageEntry} */
declare const minifyFontValues: {
    create: (/** @type {Options} */ options: Options) => Stage;
};
export { minifyFontValues as default };
//# sourceMappingURL=index.d.ts.map