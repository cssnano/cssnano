'use strict';

var test = require('tape');
var postcss = require('postcss');
var plugin = require('./');
var name = require('./package.json').name;

var tests = [{
    message: 'should deduplicate selectors',
    fixture: 'h1,h1,h1,h1{color:red}',
    expected: 'h1{color:red}'
}, {
    message: 'should natural sort selectors',
    fixture: 'h1,h10,h2,h7{color:red}',
    expected: 'h1,h2,h7,h10{color:red}'
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
