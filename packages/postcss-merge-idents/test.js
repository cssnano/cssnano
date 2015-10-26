'use strict';

var test = require('tape');
var postcss = require('postcss');
var plugin = require('./');
var name = require('./package.json').name;

var tests = [{
    message: 'should merge keyframe identifiers',
    fixture: '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}',
    expected: '@keyframes b{0%{color:#fff}to{color:#000}}',
}, {
    message: 'should merge multiple keyframe identifiers',
    fixture: '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}@keyframes c{0%{color:#fff}to{color:#000}}',
    expected: '@keyframes c{0%{color:#fff}to{color:#000}}',
}, {
    message: 'should update relevant animation declarations',
    fixture: '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}div{animation:a .2s ease}',
    expected: '@keyframes b{0%{color:#fff}to{color:#000}}div{animation:b .2s ease}'
}, {
    message: 'should update relevant animation declarations (2)',
    fixture: '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}@keyframes c{0%{color:#fff}to{color:#000}}div{animation:a .2s ease}',
    expected: '@keyframes c{0%{color:#fff}to{color:#000}}div{animation:c .2s ease}'
}, {
    message: 'should not merge vendor prefixed keyframes',
    fixture: '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}',
    expected: '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}'
}, {
    message: 'should merge duplicated keyframes with the same name',
    fixture: '@keyframes a{0%{opacity:1}to{opacity:0}}@keyframes a{0%{opacity:1}to{opacity:0}}',
    expected: '@keyframes a{0%{opacity:1}to{opacity:0}}'
}, {
    message: 'should merge duplicated counter styles with the same name',
    fixture: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style a{system:extends decimal;suffix:"> "}',
    expected: '@counter-style a{system:extends decimal;suffix:"> "}'
}, {
    message: 'should merge counter style identifiers',
    fixture: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}',
    expected: '@counter-style b{system:extends decimal;suffix:"> "}',
}, {
    message: 'should merge multiple counter style identifiers',
    fixture: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}@counter-style c{system:extends decimal;suffix:"> "}',
    expected: '@counter-style c{system:extends decimal;suffix:"> "}',
}, {
    message: 'should update relevant list style declarations',
    fixture: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}ol{list-style:a}',
    expected: '@counter-style b{system:extends decimal;suffix:"> "}ol{list-style:b}'
}, {
    message: 'should update relevant list style declarations (2)',
    fixture: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}@counter-style c{system:extends decimal;suffix:"> "}ol{list-style:a}',
    expected: '@counter-style c{system:extends decimal;suffix:"> "}ol{list-style:c}'
}, {
    message: 'should update relevant system declarations',
    fixture: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends a;suffix:"> "}@counter-style c{system:extends a;suffix:"> "}ol{list-style:c}',
    expected: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style c{system:extends a;suffix:"> "}ol{list-style:c}'
}, {
    message: 'should not output JS functions',
    fixture: '.ui.indeterminate.loader:after{-webkit-animation-direction:reverse;animation-direction:reverse;-webkit-animation-duration:1.2s;animation-duration:1.2s}',
    expected: '.ui.indeterminate.loader:after{-webkit-animation-direction:reverse;animation-direction:reverse;-webkit-animation-duration:1.2s;animation-duration:1.2s}'
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
