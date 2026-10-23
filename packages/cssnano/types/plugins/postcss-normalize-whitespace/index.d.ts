import type { Stage } from '../../pipeline/host.js';
/** @satisfies {StageEntry} */
export declare const valueEntry: {
    create: () => Stage;
};
/**
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map