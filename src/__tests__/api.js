import {readFileSync as read} from 'fs';
import postcss from 'postcss';
import ava from 'ava';
import nano from '..';
import autoprefixer from 'autoprefixer';
import {name} from '../../package.json';
import specName from './util/specName';

function pluginMacro (t, instance) {
    const css = 'h1 { color: #ffffff }';
    const min = 'h1{color:#fff}';

    return instance.process(css).then((result) => {
        t.deepEqual(result.css, min, specName('beConsumedByPostCSS'));
    });
}

ava('can be used as a postcss plugin', pluginMacro, postcss().use(nano()));
ava('can be used as a postcss plugin (2)', pluginMacro, postcss([nano()]));
ava('can be used as a postcss plugin (3)', pluginMacro, postcss(nano));

ava('can be used as a postcss plugin, with options', t => {
    const css = read(__dirname + '/fixtures/reduceCalc.fixture.css', 'utf-8');
    const exp = read(__dirname + '/fixtures/reduceCalc.disabled.css', 'utf-8');

    return postcss(nano({calc: false})).process(css).then(result => {
        t.deepEqual(result.css, exp, specName('notTransformCalcProperty'));
    });
});

ava('should use the postcss plugin api', t => {
    t.truthy(nano().postcssVersion, 'should be able to access version');
    t.deepEqual(nano().postcssPlugin, name, 'should be able to access name');
});

ava('should silently disable features if they are already consumed by postcss', t => {
    const css = 'h1{-webkit-border-radius:5px;border-radius:5px}';

    return postcss([ autoprefixer({browsers: 'Safari < 5'}), nano() ]).process(css).then(result => {
        t.deepEqual(result.css, css, specName('notIncludeAutoprefixerTwice'));
    });
});

function disableMacro (t, opts) {
    const css = 'h1 { color: #ffffff }';
    const min = 'h1{color:#ffffff}';

    return postcss().use(nano(opts)).process(css).then(result => {
        t.deepEqual(result.css, min, specName('disableColourMinification'));
    });
}

ava('should disable features', disableMacro, {'postcss-colormin': false});
ava('should disable features (2)', disableMacro, {postcssColormin: false});
ava('should disable features (3)', disableMacro, {colormin: false});

ava('should not fail when options.safe is enabled', t => {
    const css = 'h1 { z-index: 100 }';
    const min = 'h1{z-index:100}';

    return nano.process(css, {safe: true}).then(result => {
        t.deepEqual(result.css, min, specName('beConsumedByPostCSS'));
    });
});

ava('should work with sourcemaps', t => {
    return nano.process('h1{z-index:1}', {map: {inline: true}}).then(({css}) => {
        const hasMap = /sourceMappingURL=data:application\/json;base64/.test(css);
        t.truthy(hasMap);
    });
});

ava('should work with sourcemaps (2)', t => {
    return nano.process('h1{z-index:1}', {sourcemap: true}).then(({css}) => {
        const hasMap = /sourceMappingURL=data:application\/json;base64/.test(css);
        t.truthy(hasMap);
    });
});
