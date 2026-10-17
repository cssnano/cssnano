export type Options = import('./config.js').Options;
export type Config = import('./config.js').Config;
/** @typedef {import('./config.js').Options} Options */
/** @typedef {import('./config.js').Config} Config */
/**
 * @param {Options=} options
 * @return {import('postcss').Processor}
 */
declare function cssnanoPlugin(options?: Options | undefined): import('postcss').Processor;
declare namespace cssnanoPlugin {
    var _a: true;
    export { _a as postcss };
}
export { cssnanoPlugin as default, cssnanoPlugin as 'module.exports' };
//# sourceMappingURL=index.d.ts.map