import type { TargetOptions } from '#utils';
export type Options = {
    lint?: boolean;
} & TargetOptions;
declare const moduleExports: import('postcss').PluginCreator<Options> & {
    detect: (node: import('postcss').Node) => boolean;
};
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map