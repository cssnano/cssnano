declare function _exports(opts?: {}): {
    plugins: [import("postcss").PluginCreator<any>, boolean | Record<string, any> | undefined][];
};
export = _exports;
export type AdvancedOptions = {
    autoprefixer?: autoprefixer.Options;
    discardUnused?: false | import('postcss-discard-unused').Options & {
        exclude?: true;
    };
    mergeIdents?: false | {
        exclude?: true;
    };
    reduceIdents?: false | import('postcss-reduce-idents').Options & {
        exclude?: true;
    };
    zindex?: false | import('postcss-zindex').Options & {
        exclude?: true;
    };
};
export type Options = import('cssnano-preset-default').Options & AdvancedOptions;
import autoprefixer = require("autoprefixer");
