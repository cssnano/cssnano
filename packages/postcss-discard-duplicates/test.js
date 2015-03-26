var test = require('tape');
var postcss = require('postcss');
var plugin = require('./');

var tests = [{
    message: 'should remove duplicate rules',
    fixture: 'h1{font-weight:bold}h1{font-weight:bold}',
    expected: 'h1{font-weight:bold}'
}, {
    message: 'should remove duplicate declarations',
    fixture: 'h1{font-weight:bold;font-weight:bold}',
    expected: 'h1{font-weight:bold}'
}, {
    message: 'should remove duplicate declarations, with comments',
    fixture: 'h1{/*test*/font-weight:bold}h1{/*test*/font-weight:bold}',
    expected: 'h1{/*test*/font-weight:bold}'
}, {
    message: 'should remove duplicate @rules',
    fixture: '@charset "utf-8";@charset "utf-8";',
    expected: '@charset "utf-8";'
}, {
    message: 'should remove declarations before rules',
    fixture: 'h1{font-weight:bold;font-weight:bold}h1{font-weight:bold}',
    expected: 'h1{font-weight:bold}'
}, {
    message: 'should not remove declarations when selectors are different',
    fixture: 'h1{font-weight:bold}h2{font-weight:bold}',
    expected: 'h1{font-weight:bold}h2{font-weight:bold}'
}, {
    message: 'should not remove across contexts',
    fixture: 'h1{display:block}@media print{h1{display:block}}',
    expected: 'h1{display:block}@media print{h1{display:block}}'
}, {
    message: 'should not be responsible for normalising selectors',
    fixture: 'h1,h2{font-weight:bold}h2,h1{font-weight:bold}',
    expected: 'h1,h2{font-weight:bold}h2,h1{font-weight:bold}'
}, {
    message: 'should not be responsible for normalising whitespace',
    fixture: 'h1 { font-weight: bold }\nh1{font-weight:bold}',
    expected: 'h1 { font-weight: bold }\nh1{font-weight:bold}'
}, {
    message: 'should not be responsible for normalising declarations',
    fixture: 'h1{margin:10px 0 10px 0;margin:10px 0}',
    expected: 'h1{margin:10px 0 10px 0;margin:10px 0}'
}];

function process (css, options) {
    return postcss(plugin(options)).process(css).css;
}

test(require('./package.json').name, function (t) {
    t.plan(tests.length);

    tests.forEach(function (test) {
        var options = test.options || {};
        t.equal(process(test.fixture, options), test.expected, test.message);
    });
});
