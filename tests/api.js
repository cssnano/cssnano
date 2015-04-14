var postcss = require('postcss');
var test = require('tape');
var nano = require('../');
var specName = require('./util/specName');
var read = require('fs').readFileSync;

test('can be used as a postcss plugin', function (t) {
    var css = 'h1 { color: #ffffff }';
    var min = 'h1{color:#fff}';

    var out = postcss().use(nano()).process(css).css;

    t.plan(1);
    t.equal(out, min, specName('beConsumedByPostCSS'));
});

test('can be used as a postcss plugin, with options', function (t) {
    var css = read(__dirname + '/fixtures/reduceCalc.fixture.css', 'utf-8');
    var exp = read(__dirname + '/fixtures/reduceCalc.disabled.css', 'utf-8');

    var out = postcss().use(nano({calc: false})).process(css).css;

    t.plan(1);
    t.equal(out, exp, specName('notTransformCalcProperty'));
});
