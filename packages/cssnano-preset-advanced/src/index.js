import defaultPreset from 'lerna:cssnano-preset-default';
import cssDeclarationSorter from 'css-declaration-sorter';
import postcssDiscardUnused from 'lerna:postcss-discard-unused';
import postcssMergeIdents from 'lerna:postcss-merge-idents';
import postcssReduceIdents from 'lerna:postcss-reduce-idents';
import postcssZindex from 'lerna:postcss-zindex';
import autoprefixer from 'autoprefixer';

const defaultOpts = {
    autoprefixer: {
        add: false,
    },
};

export default function advancedPreset (opts = {}) {
    const options = Object.assign({}, defaultOpts, opts);

    const plugins = [
        ...defaultPreset(options).plugins,
        [cssDeclarationSorter, options.cssDeclarationSorter],
        [autoprefixer, options.autoprefixer],
        [postcssDiscardUnused, options.discardUnused],
        [postcssMergeIdents, options.mergeIdents],
        [postcssReduceIdents, options.reduceIdents],
        [postcssZindex, options.zindex],
    ];

    return {plugins};
}
