var test = require('tape');
var postcss = require('postcss');
var plugin = require('./');

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
}];

function process (css) {
    return postcss(plugin()).process(css).css;
}

test(require('./package.json').name, function (t) {
    t.plan(tests.length);

    tests.forEach(function (test) {
        t.equal(process(test.fixture), test.expected, test.message);
    });
});
