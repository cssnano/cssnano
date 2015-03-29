var test = require('tape');
var postcss = require('postcss');
var plugin = require('./');

var tests = [{
    message: 'should minify color values',
    fixture: 'h1{color: yellow}',
    expected: 'h1{color: #ff0}'
}, {
    message: 'should minify color values (2)',
    fixture: 'h1{box-shadow: 0 1px 3px rgba(255, 230, 220, 0.5)}',
    expected: 'h1{box-shadow: 0 1px 3px rgba(255,230,220,.5)}'
}, {
    message: 'should minify color values (3)',
    fixture: 'h1{background: hsla(134, 50%, 50%, 1)}',
    expected: 'h1{background: #40bf5e}'
}, {
    message: 'should minify color values (4)',
    fixture: 'h1{text-shadow: 1px 1px 2px #000000}',
    expected: 'h1{text-shadow: 1px 1px 2px #000}'
}, {
    message: 'should not minify in font properties',
    fixture: 'h1{font-family: black}',
    expected: 'h1{font-family: black}'
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
