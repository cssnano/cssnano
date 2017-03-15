import fs from 'fs';
import postcss from 'postcss';
import cssnano from '../packages/cssnano';
import frameworks from './frameworks';
import formatter from './integrationFormatter';

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

export function processCSSWithPresetFactory (plugin, preset) {
    const {processor: solo} = processCSSFactory(plugin);
    const {processor: multiple} = processCSSFactory([cssnano({preset})]);

    function processCSS (t, fixture, expected) {
        return Promise.all([
            solo(fixture).then(({css}) => t.is(css, expected)),
            multiple(fixture).then(({css}) => t.is(css, expected)),
        ]);
    };

    return processCSS;
}

export function loadPreset (preset) {
    return postcss(cssnano({preset}));
}

export function integrationTests (t, preset, integrations) {
    const promises = [];
    Object.keys(frameworks).forEach(framework => {
        promises.push(postcss([cssnano, formatter]).process(frameworks[framework], {preset}).then(result => {
            t.is(result.css, fs.readFileSync(`${integrations}/${framework}.css`, 'utf8'));
        }));
    });
    return Promise.all(promises);
}
