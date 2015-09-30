var postcss = require('postcss');
var plugin = require('./');
var test  = require('tape');

var tests = [{
    message: 'should normalise @media queries',
    fixture: '@media SCREEN ,\tprint {h1{color:red}}@media print,screen{h2{color:blue}}',
    expected: '@media print,SCREEN {h1{color:red}}@media print,screen{h2{color:blue}}'
}, {
    message: 'should normalise @media queries (2)',
    fixture: '@media only screen \n and ( min-width: 400px, min-height: 500px ){h1{color:blue}}',
    expected: '@media only screen and (min-width:400px,min-height:500px){h1{color:blue}}'
}, {
    message: 'should not mangle @keyframe from & 100% in other values',
    fixture: '@keyframes test{x-from-tag{color:red}5100%{color:blue}}',
    expected: '@keyframes test{x-from-tag{color:red}5100%{color:blue}}'
}];

test('postcss-minify-params', function (t) {
    t.plan(tests.length);

    tests.forEach(function (test) {
        t.equal(postcss(plugin).process(test.fixture).css, test.expected, test.message);
    });
});
