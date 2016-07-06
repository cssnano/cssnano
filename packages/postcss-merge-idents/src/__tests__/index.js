import ava from 'ava';
import postcss from 'postcss';
import {name} from '../../package.json';
import plugin from '..';

const tests = [{
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
    expected: '@keyframes b{0%{color:#fff}to{color:#000}}div{animation:b .2s ease}',
}, {
    message: 'should update relevant animation declarations (2)',
    fixture: '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}@keyframes c{0%{color:#fff}to{color:#000}}div{animation:a .2s ease}',
    expected: '@keyframes c{0%{color:#fff}to{color:#000}}div{animation:c .2s ease}',
}, {
    message: 'should not merge vendor prefixed keyframes',
    fixture: '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}',
    expected: '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}',
}, {
    message: 'should merge duplicated keyframes with the same name',
    fixture: '@keyframes a{0%{opacity:1}to{opacity:0}}@keyframes a{0%{opacity:1}to{opacity:0}}',
    expected: '@keyframes a{0%{opacity:1}to{opacity:0}}',
}, {
    message: 'should merge duplicated counter styles with the same name',
    fixture: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style a{system:extends decimal;suffix:"> "}',
    expected: '@counter-style a{system:extends decimal;suffix:"> "}',
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
    expected: '@counter-style b{system:extends decimal;suffix:"> "}ol{list-style:b}',
}, {
    message: 'should update relevant list style declarations (2)',
    fixture: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}@counter-style c{system:extends decimal;suffix:"> "}ol{list-style:a}',
    expected: '@counter-style c{system:extends decimal;suffix:"> "}ol{list-style:c}',
}, {
    message: 'should update relevant system declarations',
    fixture: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends a;suffix:"> "}@counter-style c{system:extends a;suffix:"> "}ol{list-style:c}',
    expected: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style c{system:extends a;suffix:"> "}ol{list-style:c}',
}, {
    message: 'should not output JS functions',
    fixture: '.ui.indeterminate.loader:after{-webkit-animation-direction:reverse;animation-direction:reverse;-webkit-animation-duration:1.2s;animation-duration:1.2s}',
    expected: '.ui.indeterminate.loader:after{-webkit-animation-direction:reverse;animation-direction:reverse;-webkit-animation-duration:1.2s;animation-duration:1.2s}',
}, {
    message: 'should handle duplicated definitions',
    fixture: [
        '.checkbox input[type=checkbox]:checked + .checkbox-material:before{-webkit-animation:rippleOn 500ms;-o-animation:rippleOn 500ms;animation:rippleOn 500ms}',
        '.checkbox input[type=checkbox]:checked + .checkbox-material .check:after{-webkit-animation:rippleOn 500ms forwards;-o-animation:rippleOn 500ms forwards;animation:rippleOn 500ms forwards}',
        '@-webkit-keyframes rippleOn{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
        '@-o-keyframes rippleOn{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
        '@keyframes rippleOn{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
        '@-webkit-keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
        '@-o-keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
        '@keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
        '@keyframes rippleOn{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
        '@keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
    ].join(''),
    expected: [
        '.checkbox input[type=checkbox]:checked + .checkbox-material:before{-webkit-animation:rippleOff 500ms;-o-animation:rippleOff 500ms;animation:rippleOff 500ms}',
        '.checkbox input[type=checkbox]:checked + .checkbox-material .check:after{-webkit-animation:rippleOff 500ms forwards;-o-animation:rippleOff 500ms forwards;animation:rippleOff 500ms forwards}',
        '@-webkit-keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
        '@-o-keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
        '@keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
    ].join(''),
}, {
    message: 'should handle duplication within media queries',
    fixture: [
        '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
        '@media (max-width:400px){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
        '.spin{animation:1s spin infinite linear}',
    ].join(''),
    expected: [
        '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
        '@media (max-width:400px){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
        '.spin{animation:1s spin infinite linear}',
    ].join(''),
}, {
    message: 'should handle duplication within supports rules',
    fixture: [
        '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
        '@supports (transform:rotate(0deg)){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
        '.spin{animation:1s spin infinite linear}',
    ].join(''),
    expected: [
        '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
        '@supports (transform:rotate(0deg)){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
        '.spin{animation:1s spin infinite linear}',
    ].join(''),
}, {
    message: 'should handle duplication within supports rules & media queries',
    fixture: [
        '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
        '@media (max-width:400px){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
        '@supports (transform:rotate(0deg)){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
        '.spin{animation:1s spin infinite linear}',
    ].join(''),
    expected: [
        '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
        '@media (max-width:400px){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
        '@supports (transform:rotate(0deg)){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
        '.spin{animation:1s spin infinite linear}',
    ].join(''),
}];


tests.forEach(test => {
    ava(test.message, t => {
        const out = postcss(plugin(test.options || {})).process(test.fixture);
        t.deepEqual(out.css, test.expected);
    });
});

ava('should use the postcss plugin api', t => {
    t.truthy(plugin().postcssVersion, 'should be able to access version');
    t.deepEqual(plugin().postcssPlugin, name, 'should be able to access name');
});
