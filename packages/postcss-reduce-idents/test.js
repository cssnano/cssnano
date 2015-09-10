'use strict';

var test = require('tape');
var postcss = require('postcss');
var plugin = require('./');
var name = require('./package.json').name;
var encode = require('./lib/encode');

var tests = [{
    message: 'should rename keyframes',
    fixture: '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
    expected: '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}'
}, {
    message: 'should rename multiple keyframes',
    fixture: '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}@keyframes fadeOut{0%{opacity:1}to{opacity:0}}.one{animation-name:whiteToBlack}.two{animation-name:fadeOut}',
    expected: '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{opacity:1}to{opacity:0}}.one{animation-name:a}.two{animation-name:b}'
}, {
    message: 'should reuse the same animation name for vendor prefixed keyframes',
    fixture: '@-webkit-keyframes whiteToBlack{0%{color:#fff}to{color:#000}}@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:whiteToBlack;animation-name:whiteToBlack}',
    expected: '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:a;animation-name:a}'
}, {
    message: 'should support multiple animations',
    fixture: '@keyframes one{0%{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes two{0%{border-width:0;opacity:0}}.loader{animation:one  1250ms  infinite linear, two .3s ease-out both}',
    expected: '@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes b{0%{border-width:0;opacity:0}}.loader{animation:a 1250ms infinite linear,b .3s ease-out both}'
}, {
    message: 'should not touch animation names that are not defined in the file',
    fixture: '.one{animation-name:fadeInUp}',
    expected: '.one{animation-name:fadeInUp}'
}, {
    message: 'should not touch keyframes that are not referenced in the file',
    fixture: '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}',
    expected: '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}'
}, {
    message: 'should not touch keyframes & animation names, combined',
    fixture: '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:fadeInUp}',
    expected: '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:fadeInUp}'
}, {
    message: 'should rename counter styles',
    fixture: '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
    expected: '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}'
}, {
    message: 'should rename multiple counter styles & be aware of extensions',
    fixture: '@counter-style custom{system:extends decimal;suffix:"> "}@counter-style custom2{system:extends  custom;prefix:"-"}ol{list-style:custom2}',
    expected: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends a;prefix:"-"}ol{list-style:b}'
}, {
    message: 'should not touch counter styles that are not referenced in the file',
    fixture: '@counter-style custom{system:extends decimal;suffix:"> "}',
    expected: '@counter-style custom{system:extends decimal;suffix:"> "}'
}, {
    message: 'should not touch list-styles that are not defined in the file',
    fixture: 'ol{list-style:custom2}',
    expected: 'ol{list-style:custom2}'
}, {
    message: 'should rename counters',
    fixture: 'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
    expected: 'body{counter-reset:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}'
}, {
    message: 'should rename counters (2)',
    fixture: 'h3:before{content:counter(section, section2);counter-increment:section}',
    expected: 'h3:before{content:counter(a,section2);counter-increment:a}'
}, {
    message: 'should rename multiple counters',
    fixture: 'h1:before{counter-reset:chapter 1 section page 1;content: counter(chapter) \t "."  counter(section) " (pg." counter(page) ") "}',
    expected: 'h1:before{counter-reset:a 1 b c 1;content: counter(a) "." counter(b) " (pg." counter(c) ") "}'
}, {
    message: 'should rename multiple counters with random order',
    fixture: 'h1:before{content: counter(chapter) "." counter(section) " (pg." counter(page) ") ";counter-reset:chapter 1 section  page 1}',
    expected: 'h1:before{content: counter(a) "." counter(b) " (pg." counter(c) ") ";counter-reset:a 1 b c 1}'
}, {
    message: 'should not touch counters that are not outputted',
    fixture: 'h1{counter-reset:chapter  1 section page 1}',
    expected: 'h1{counter-reset:chapter 1 section page 1}'
}, {
    message: 'should not touch counter functions which are not defined',
    fixture: 'h1:before{content:counter(chapter) ". "}',
    expected: 'h1:before{content:counter(chapter) ". "}'
}];

function process (css, options) {
    return postcss(plugin(options)).process(css).css;
}

test('encoder', function (t) {
    var iterations = new Array(1984);
    var arr = Array.apply([], iterations).map(function (a, b) { return b; });
    var cache = [];

    t.plan(arr.length);

    arr.map(function (num) {
        var encoded = encode(num);
        cache.push(encoded);
        var indexes = cache.filter(function (c) { return c === encoded; });
        t.equal(indexes.length, 1, encoded + ' should be returned only once');
    });
});

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
