import postcss from 'postcss';

export function usePostCSSPlugin (t, plugin) {
    t.truthy(plugin.postcssVersion, 'should be able to access version');
    t.truthy(plugin.postcssPlugin, 'should be able to access name');
}

export function processCSSFactory (plugin) {
    let processor, processCSS, passthroughCSS;

    if (Array.isArray(plugin)) {
        processor = (fixture) => postcss(plugin).process(fixture);

        processCSS = (t, fixture, expected) => {
            return processor(fixture).then(result => {
                t.deepEqual(result.css, expected);
                return result;
            });
        };

        passthroughCSS = (t, fixture) => {
            return processCSS(t, fixture, fixture);
        };
    } else {
        processor = (fixture, options) => {
            return postcss(plugin(options)).process(fixture, options);
        };

        processCSS = (t, fixture, expected, options) => {
            return processor(fixture, options).then(result => {
                t.deepEqual(result.css, expected);
                return result;
            });
        };

        passthroughCSS = (t, fixture, options) => {
            return processCSS(t, fixture, fixture, options);
        };
    }

    return {processor, processCSS, passthroughCSS};
}
