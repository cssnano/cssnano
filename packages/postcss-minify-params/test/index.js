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
    message: 'should not normalise "not all and" in @media queries',
    fixture: '@media not all and (min-width: 768px){h1{color:blue}}',
    expected: '@media not all and (min-width:768px){h1{color:blue}}',
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
}, {
    message: 'should reduce min-aspect-ratio',
    fixture: '@media (min-aspect-ratio: 32/18){h1{color:blue}}',
    expected: '@media (min-aspect-ratio:16/9){h1{color:blue}}',
}, {
    message: 'should reduce max-aspect-ratio',
    fixture: '@media (max-aspect-ratio: 48000000/32000000){h1{color:blue}}',
    expected: '@media (max-aspect-ratio:3/2){h1{color:blue}}',
}, {
    message: 'should multiply aspect ratio',
    fixture: '@media (max-aspect-ratio: 1.5/1){h1{color:blue}}',
    expected: '@media (max-aspect-ratio:3/2){h1{color:blue}}',
}, {
    message: 'should multiply aspect ratio (2)',
    fixture: '@media (max-aspect-ratio: .5 / 1){h1{color:blue}}',
    expected: '@media (max-aspect-ratio:1/2){h1{color:blue}}',
}, {
    message: 'should not throw on empty parentheses',
    fixture: '@media (){h1{color:blue}}',
    expected: '@media (){h1{color:blue}}',
}];

/* eslint-enable */

describe('postcss-minify-params', () => {
    tests.forEach(({ message, fixture, expected }) => {
        it(message, () => {
            assert.equal(postcss(plugin).process(fixture).css, expected);
        });
    });
});
