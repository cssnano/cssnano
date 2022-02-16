declare function _exports(opts?: Options): {
    plugins: [import('postcss').PluginCreator<any>, false | Record<string, any> | undefined][];
};
export = _exports;
export type SimpleOptions = false | {
    exclude?: true;
};
export type Options = {
    discardComments?: false | import('postcss-discard-comments').Options & {
        exclude?: true;
    };
    normalizeWhitespace?: SimpleOptions;
    discardEmpty?: SimpleOptions;
    rawCache?: SimpleOptions;
};
import { rawCache } from "cssnano-utils";
