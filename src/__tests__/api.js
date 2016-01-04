'use strict';

var postcss = require('postcss');
var test = require('ava');
var nano = require('../');
var specName = require('./util/specName');
var read = require('fs').readFileSync;
var autoprefixer = require('autoprefixer');
var name = require('../../package.json').name;

test('can be used as a postcss plugin', function (t) {
    var css = 'h1 { color: #ffffff }';
    var min = 'h1{color:#fff}';

    return postcss().use(nano()).process(css).then(function (result) {
        t.same(result.css, min, specName('beConsumedByPostCSS'));
    });
});

test('can be used as a postcss plugin (2)', function (t) {
    var css = 'h1 { color: #ffffff }';
    var min = 'h1{color:#fff}';

    return postcss([nano()]).process(css).then(function (result) {
        t.same(result.css, min, specName('beConsumedByPostCSS'));
    });
});

test('can be used as a postcss plugin (3)', function (t) {
    var css = 'h1 { color: #ffffff }';
    var min = 'h1{color:#fff}';

    return postcss(nano).process(css).then(function (result) {
        t.same(result.css, min, specName('beConsumedByPostCSS'));
    });
});

test('can be used as a postcss plugin, with options', function (t) {
    var css = read(__dirname + '/fixtures/reduceCalc.fixture.css', 'utf-8');
    var exp = read(__dirname + '/fixtures/reduceCalc.disabled.css', 'utf-8');

    return postcss(nano({calc: false})).process(css).then(function (result) {
        t.same(result.css, exp, specName('notTransformCalcProperty'));
    });
});

test('should use the postcss plugin api', function (t) {
    t.ok(nano().postcssVersion, 'should be able to access version');
    t.same(nano().postcssPlugin, name, 'should be able to access name');
});

test('should silently disable features if they are already consumed by postcss', function (t) {
    var css = 'h1{-webkit-border-radius:5px;border-radius:5px}';
    var exp = 'h1{-webkit-border-radius:5px;border-radius:5px}';

    return postcss([ autoprefixer({browsers: 'Safari < 5'}), nano() ]).process(css).then(function (result) {
        t.same(result.css, exp, specName('notIncludeAutoprefixerTwice'));
    });
});

test('should disable features if the user specifies so (1)', function (t) {
    var css = 'h1 { color: #ffffff }';
    var min = 'h1{color:#ffffff}';

    return postcss().use(nano({
        'postcss-colormin': false
    })).process(css).then(function (result) {
        t.same(result.css, min, specName('disableColourMinification'));
    });
});

test('should disable features if the user specifies so (2)', function (t) {
    var css = 'h1 { color: #ffffff }';
    var min = 'h1{color:#ffffff}';

    return postcss().use(nano({
        postcssColormin: false
    })).process(css).then(function (result) {
        t.same(result.css, min, specName('disableColourMinification'));
    });
});

test('should disable features if the user specifies so (3)', function (t) {
    var css = 'h1 { color: #ffffff }';
    var min = 'h1{color:#ffffff}';

    return postcss().use(nano({
        colormin: false
    })).process(css).then(function (result) {
        t.same(result.css, min, specName('disableColourMinification'));
    });
});

test('should not fail when options.safe is enabled', function (t) {
    var css = 'h1 { z-index: 100 }';
    var min = 'h1{z-index:100}';

    return nano.process(css, {safe: true}).then(function (result) {
        t.same(result.css, min, specName('beConsumedByPostCSS'));
    });
});
