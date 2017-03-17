import fs from 'fs';
import postcss from 'postcss';
import cssnano from 'lerna:cssnano';
import frameworks from './frameworks';
import formatter from './integrationFormatter';

export function usePostCSSPlugin (t, plugin) {
    t.truthy(plugin.postcssVersion, 'should be able to access version');
    t.truthy(plugin.postcssPlugin, 'should be able to access name');
}

export function processCSSFactory (plugin) {
    let processor, processCSS, passthroughCSS;

    if (Array.isArray(plugin)) {
        processor = (fixture, options) => postcss(plugin).process(fixture, options);

        processCSS = (t, fixture, expected, options) => {
            return processor(fixture, options).then(result => {
                t.deepEqual(result.css, expected);
                return result;
            });
        };

        passthroughCSS = (t, fixture, options) => {
            return processCSS(t, fixture, fixture, options);
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

export function processCSSWithPresetFactory (preset) {
    return processCSSFactory([cssnano({preset})]);
}

export function loadPreset (preset) {
    return postcss(cssnano({preset}));
}

export function integrationTests (t, preset, integrations) {
    return Promise.all(Object.keys(frameworks).map(framework => {
        const css = frameworks[framework];
        return postcss([cssnano({preset}), formatter]).process(css).then(result => {
            t.is(result.css, fs.readFileSync(`${integrations}/${framework}.css`, 'utf8'));
        });
    }));
}
