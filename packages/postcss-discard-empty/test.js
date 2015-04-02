var test = require('tape');
var postcss = require('postcss');
var plugin = require('./');
var name = require('./package.json').name;

var tests = [{
    message: 'should remove empty @ rules',
    fixture: '@font-face;',
    expected: ''
}, {
    message: 'should remove empty @ rules (2)',
    fixture: '@font-face {}',
    expected: ''
}, {
    message: 'should not mangle @ rules with decls',
    fixture: '@font-face {font-family: Helvetica}',
    expected: '@font-face {font-family: Helvetica}'
}, {
    message: 'should not mangle @ rules with parameters',
    fixture: '@charset "utf-8";',
    expected: '@charset "utf-8";'
}, {
    message: 'should remove empty rules',
    fixture: 'h1{}h2{}h4{}h5,h6{}',
    expected: ''
}, {
    message: 'should remove empty declarations',
    fixture: 'h1{color:}',
    expected: ''
}, {
    message: 'should remove null selectors',
    fixture: '{color:blue}',
    expected: ''
}, {
    message: 'should remove null selectors in media queries',
    fixture: '@media screen, print {{}}',
    expected: ''
}, {
    message: 'should remove empty media queries',
    fixture: '@media screen, print {h1,h2{}}',
    expected: ''
}, {
    message: 'should not be responsible for removing comments',
    fixture: 'h1{/*comment*/}',
    expected: 'h1{/*comment*/}'
}];

function process (css, options) {
    return postcss(plugin(options)).process(css).css;
}

test(name, function (t) {
    t.plan(tests.length);

    tests.forEach(function (test) {
        var options = test.options || {};
        t.equal(process(test.fixture, options), test.expected, test.message);
    });
});

test('should use the postcss plugin api', function (t) {
    t.plan(2);
    t.ok(plugin().postcssVersion, 'should be able to access version');
    t.equal(plugin().postcssPlugin, name, 'should be able to access name');
});
