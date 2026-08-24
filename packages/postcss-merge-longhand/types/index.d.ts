import type { Rule } from 'postcss';
export type Family = {
    explode: (rule: Rule) => void;
    merge: (rule: Rule) => void;
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