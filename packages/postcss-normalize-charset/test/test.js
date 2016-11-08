var test  = require('ava');
var devtools = require('postcss-devtools');
var postcss = require('postcss');
var plugin = require('../');

function processCssFactory (plugins) {
    return function (t, fixture, expected) {
        return postcss(plugins).process(fixture).then(function (result) {
            t.deepEqual(result.css, expected);
        });
    };
}

function sourceTest (t, origin) {
    return postcss.plugin('source-test', function () {
        return function (css) {
            var node = css.first;
            var source;
            if (node.name === 'charset') {
                source = node.source;
                source = source.input.css.slice(source.start.column - 1, source.end.column);
            }
            t.deepEqual(source, origin, 'should correctly set source code');
        };
    });
}

function processCssWithSource (t, fixture, expected, source) {
    return processCssFactory([ plugin(), sourceTest(t, source) ])(t, fixture, expected);
}

function processCssBenchmark (t, fixture, expected, options) {
    return processCssFactory([ devtools(), plugin(options) ])(t, fixture, expected);
}

function processCss (t, fixture, expected, options) {
    return processCssFactory(plugin(options))(t, fixture, expected);
}

var copyright = 'a{content:"©"}';

test(
    'should add a charset if a file contains non-ascii',
    processCssWithSource,
    copyright,
    '@charset "utf-8";\n' + copyright,
    copyright
);

test(
    'should move up first existing charset',
    processCssWithSource,
    'b{жизнь:калька}@charset "windows-1251";' + copyright,
    '@charset "windows-1251";b{жизнь:калька}' + copyright,
    'b{жизнь:калька}'
);

test(
    'should remove extra charset rules',
    processCssWithSource,
    copyright + '@charset "utf-8";@charset "windows-1251";',
    '@charset "utf-8";\n' + copyright,
    copyright
);

test(
    'should remove all charset rules if a file doesn\'t contain non-ascii',
    processCss,
    'a{content:"c"}@charset "utf-8";@charset "windows-1251";',
    'a{content:"c"}'
);

test(
    'should not add a charset with add set to false',
    processCss,
    copyright,
    copyright,
    {add: false}
);

test(
    'benchmark (add on)',
    processCssBenchmark,
    copyright,
    '@charset "utf-8";\n' + copyright
);

test(
    'benchmark (add off)',
    processCssBenchmark,
    copyright,
    copyright,
    {add: false}
);
