const assert = require('assert');
const postcss = require('postcss');
const plugin = require('../src');

/* eslint-disable */

const tests = [{
    message: 'should normalise @media queries',
    fixture: '@media SCREEN ,\tprint {h1{color:red}}@media print,screen{h2{color:blue}}',
    expected: '@media print,SCREEN {h1{color:red}}@media print,screen{h2{color:blue}}'
}, {
    message: 'should normalise @media queries (2)',
    fixture: '@media only screen \n and ( min-width: 400px, min-height: 500px ){h1{color:blue}}',
    expected: '@media only screen and (min-width:400px,min-height:500px){h1{color:blue}}'
}, {
    message: 'should normalise "all" in @media queries',
    fixture: '@media all{h1{color:blue}}',
    expected: '@media{h1{color:blue}}',
}, {
    message: 'should normalise "all and" in @media queries',
    fixture: '@media all and (min-width:500px){h1{color:blue}}',
    expected: '@media (min-width:500px){h1{color:blue}}',
}, {
    message: 'should not remove "all" from other at-rules',
    fixture: '@foo all;',
    expected: '@foo all;',
}, {
    message: 'should not mangle @keyframe from & 100% in other values',
    fixture: '@keyframes test{x-from-tag{color:red}5100%{color:blue}}',
    expected: '@keyframes test{x-from-tag{color:red}5100%{color:blue}}'
}, {
    message: 'should not parse at rules without params',
    fixture: '@font-face{font-family:test;src:local(test)}',
    expected: '@font-face{font-family:test;src:local(test)}'
}];

/* eslint-enable */

describe('postcss-minify-params', () => {
    tests.forEach(({ message, fixture, expected }) => {
        it(message, () => {
            assert.equal(postcss(plugin).process(fixture).css, expected);
        });
    });
});
