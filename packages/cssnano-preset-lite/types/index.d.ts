export = defaultPreset;
/**
 * @param {Options} opts
 * @return {{plugins: [import('postcss').PluginCreator<any>, false | Record<string, any> | undefined][]}}
 */
declare function defaultPreset(opts?: Options): {
    plugins: [import('postcss').PluginCreator<any>, false | Record<string, any> | undefined][];
};
declare namespace defaultPreset {
    export { SimpleOptions, Options };
}
type Options = {
    discardComments?: false | import('postcss-discard-comments').Options & {
        exclude?: true;
    };
    normalizeWhitespace?: SimpleOptions;
    discardEmpty?: SimpleOptions;
    rawCache?: SimpleOptions;
};
type SimpleOptions = false | {
    exclude?: true;
};
import { rawCache } from "cssnano-utils";
