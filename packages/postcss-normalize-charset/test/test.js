var test  = require('tape');
var postcss = require('postcss');
var plugin = require('../');

var tests = [
    {
        message: 'should adds charset if file contains non-ascii',
        fixture: 'a{content:"©"}',
        expected: '@charset "utf-8";\na{content:"©"}',
        source: 'a{content:"©"}'
    }, {
        message: 'should move up first existing charset',
        fixture: 'b{жизнь:калька}@charset "windows-1251";a{content:"©"}',
        expected: '@charset "windows-1251";b{жизнь:калька}a{content:"©"}',
        source: 'b{жизнь:калька}'
    }, {
        message: 'should remove extra charset rules',
        fixture: 'a{content:"©"}@charset "utf-8";@charset "windows-1251";',
        expected: '@charset "utf-8";\na{content:"©"}',
        source: 'a{content:"©"}'
    }, {
        message: 'should remove all charset rules if source doesn\'t contain non-ascii',
        fixture: 'a{content:"c"}@charset "utf-8";@charset "windows-1251";',
        expected: 'a{content:"c"}'
    }
];

test('postcss-normalize-charset', function (t) {
    t.plan(tests.length * 2);
    tests.reduce(function (promise, test) {
        return promise.then(function () {
            return postcss(plugin(test.options), postcss.plugin('source-test', function () {
                return function (css) {
                    var node = css.root().nodes[0];
                    var source;
                    if (node.name === 'charset') {
                        source = node.source;
                        source = source.input.css.slice(source.start.column - 1, source.end.column);
                    }

                    t.deepEqual(source, test.source, 'should correctly set source code');
                };
            })).process(test.fixture).then(function (result) {
                t.equal(result.css, test.expected, test.message);
            });
        });
    }, Promise.resolve());
});
