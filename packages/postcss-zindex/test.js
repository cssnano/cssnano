var test = require('tape');
var postcss = require('postcss');
var plugin = require('./');
var name = require('./package.json').name;

var tests = [{
    message: 'should optimise large z-index values',
    fixture: 'h1{z-index:9999}',
    expected: 'h1{z-index:1}'
}, {
    message: 'should optimise multiple ascending z-index values',
    fixture: 'h1{z-index:150}h2{z-index:350}h3{z-index:600}',
    expected: 'h1{z-index:1}h2{z-index:2}h3{z-index:3}'
}, {
    message: 'should optimise multiple descending z-index values',
    fixture: 'h1{z-index:600}h2{z-index:350}h3{z-index:150}',
    expected: 'h1{z-index:3}h2{z-index:2}h3{z-index:1}'
}, {
    message: 'should optimise multiple unsorted z-index values',
    fixture: 'h1{z-index:5}h2{z-index:500}h3{z-index:40}h4{z-index:2}',
    expected: 'h1{z-index:2}h2{z-index:4}h3{z-index:3}h4{z-index:1}'
}, {
    message: 'should optimise !important z-index values',
    fixture: 'h1{z-index:1337!important}h2{z-index:9001!important}',
    expected: 'h1{z-index:1!important}h2{z-index:2!important}'
}, {
    message: 'should not optimise negative z-index values',
    fixture: 'h1{z-index:-1}h2{z-index:-2}',
    expected: 'h1{z-index:-1}h2{z-index:-2}'
}, {
    message: 'should not convert 0 values',
    fixture: 'h1{z-index:0}h2{z-index:10}',
    expected: 'h1{z-index:0}h2{z-index:1}'
}, {
    message: 'should not mangle inherit',
    fixture: 'h1{z-index:inherit}',
    expected: 'h1{z-index:inherit}'
}, {
    message: 'should not mangle auto',
    fixture: 'h1{z-index:auto}h2{z-index:2000}',
    expected: 'h1{z-index:auto}h2{z-index:1}'
}, {
    message: 'should pass through when it doesn\'t find a z-index value',
    fixture: 'h1{color:black;font-weight:bold}',
    expected: 'h1{color:black;font-weight:bold}'
}, {
    message: 'should abort early if any negative z-indices were found',
    fixture: '.a{z-index:8}.b{z-index:-2}.c{z-index:10}.d{z-index:8}.e{z-index:6}',
    expected: '.a{z-index:8}.b{z-index:-2}.c{z-index:10}.d{z-index:8}.e{z-index:6}'
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
