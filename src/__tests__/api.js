import postcss from 'postcss';
import ava from 'ava';
import nano from '..';
import specName from './util/specName';
import {readFileSync as read} from 'fs';
import autoprefixer from 'autoprefixer';
import {name} from '../../package.json';

ava('can be used as a postcss plugin', t => {
    const css = 'h1 { color: #ffffff }';
    const min = 'h1{color:#fff}';

    return postcss().use(nano()).process(css).then(result => {
        t.deepEqual(result.css, min, specName('beConsumedByPostCSS'));
    });
});

ava('can be used as a postcss plugin (2)', t => {
    const css = 'h1 { color: #ffffff }';
    const min = 'h1{color:#fff}';

    return postcss([nano()]).process(css).then(result => {
        t.deepEqual(result.css, min, specName('beConsumedByPostCSS'));
    });
});

ava('can be used as a postcss plugin (3)', t => {
    const css = 'h1 { color: #ffffff }';
    const min = 'h1{color:#fff}';

    return postcss(nano).process(css).then(result => {
        t.deepEqual(result.css, min, specName('beConsumedByPostCSS'));
    });
});

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
    const exp = 'h1{-webkit-border-radius:5px;border-radius:5px}';

    return postcss([ autoprefixer({browsers: 'Safari < 5'}), nano() ]).process(css).then(result => {
        t.deepEqual(result.css, exp, specName('notIncludeAutoprefixerTwice'));
    });
});

ava('should disable features if the user specifies so (1)', t => {
    const css = 'h1 { color: #ffffff }';
    const min = 'h1{color:#ffffff}';

    return postcss().use(nano({
        'postcss-colormin': false
    })).process(css).then(result => {
        t.deepEqual(result.css, min, specName('disableColourMinification'));
    });
});

ava('should disable features if the user specifies so (2)', t => {
    const css = 'h1 { color: #ffffff }';
    const min = 'h1{color:#ffffff}';

    return postcss().use(nano({
        postcssColormin: false
    })).process(css).then(result => {
        t.deepEqual(result.css, min, specName('disableColourMinification'));
    });
});

ava('should disable features if the user specifies so (3)', t => {
    const css = 'h1 { color: #ffffff }';
    const min = 'h1{color:#ffffff}';

    return postcss().use(nano({
        colormin: false
    })).process(css).then(result => {
        t.deepEqual(result.css, min, specName('disableColourMinification'));
    });
});

ava('should not fail when options.safe is enabled', t => {
    const css = 'h1 { z-index: 100 }';
    const min = 'h1{z-index:100}';

    return nano.process(css, {safe: true}).then(result => {
        t.deepEqual(result.css, min, specName('beConsumedByPostCSS'));
    });
});
