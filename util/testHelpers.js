import postcss from 'postcss';

export function usePostCSSPlugin (t, plugin) {
    t.truthy(plugin.postcssVersion, 'should be able to access version');
    t.truthy(plugin.postcssPlugin, 'should be able to access name');
}

export function processCSSFactory (plugin) {
    let processCSS, passthroughCSS;

    if (Array.isArray(plugin)) {
        processCSS = (t, fixture, expected) => {
            return postcss(plugin).process(fixture).then(({css}) => {
                t.deepEqual(css, expected);
            });
        };

        passthroughCSS = (t, fixture) => {
            return processCSS(t, fixture, fixture);
        };
    } else {
        processCSS = (t, fixture, expected, options) => {
            return postcss(plugin(options)).process(fixture, options).then(({css}) => {
                t.deepEqual(css, expected);
            });
        };

        passthroughCSS = (t, fixture, options) => {
            return processCSS(t, fixture, fixture, options);
        };
    }

    return {processCSS, passthroughCSS};
}
