import test from 'ava';
import plugin from '..';
import {usePostCSSPlugin, processCSSFactory} from '../../../../util/testHelpers';

const {processCSS, passthroughCSS} = processCSSFactory(plugin);

test(
    'linear: should convert "to top" to 0deg',
    processCSS,
    'background:linear-gradient(to top,#ffe500,#121)',
    'background:linear-gradient(0deg,#ffe500,#121)'
);

test(
    'linear: should convert "to right" to 90deg',
    processCSS,
    'background:linear-gradient(to right,#ffe500,#121)',
    'background:linear-gradient(90deg,#ffe500,#121)'
);

test(
    'linear: should convert "to bottom" to 180deg',
    processCSS,
    'background:linear-gradient(to bottom,#ffe500,#121)',
    'background:linear-gradient(180deg,#ffe500,#121)'
);

test(
    'linear: should convert "to left" to 270deg',
    processCSS,
    'background:linear-gradient(to left,#ffe500,#121)',
    'background:linear-gradient(270deg,#ffe500,#121)'
);

test(
    'linear: should convert "to top" to 0deg (with a solid colour)',
    processCSS,
    'background:#ffe500 linear-gradient(to top,#ffe500,#121)',
    'background:#ffe500 linear-gradient(0deg,#ffe500,#121)'
);

test(
    'repeating-linear: should convert "to top" to 0deg',
    processCSS,
    'background:repeating-linear-gradient(to top,#ffe500,#121)',
    'background:repeating-linear-gradient(0deg,#ffe500,#121)'
);

test(
    'repeating-linear: should convert "to right" to 90deg',
    processCSS,
    'background:repeating-linear-gradient(to right,#ffe500,#121)',
    'background:repeating-linear-gradient(90deg,#ffe500,#121)'
);

test(
    'repeating-linear: should convert "to bottom" to 180deg',
    processCSS,
    'background:repeating-linear-gradient(to bottom,#ffe500,#121)',
    'background:repeating-linear-gradient(180deg,#ffe500,#121)'
);

test(
    'repeating-linear: should convert "to left" to 270deg',
    processCSS,
    'background:repeating-linear-gradient(to left,#ffe500,#121)',
    'background:repeating-linear-gradient(270deg,#ffe500,#121)'
);

test(
    'linear: should not convert "to top right" to an angle',
    passthroughCSS,
    'background:linear-gradient(to top right,#ffe500,#121)'
);

test(
    'linear: should not convert "to bottom left" to an angle',
    passthroughCSS,
    'background:linear-gradient(to bottom left,#ffe500,#121)'
);

test(
    'linear: should reduce length values if they are the same',
    processCSS,
    'background:linear-gradient(45deg,#ffe500 50%,#121 50%)',
    'background:linear-gradient(45deg,#ffe500 50%,#121 0)'
);

test(
    'linear: should reduce length values if they are less',
    processCSS,
    'background:linear-gradient(45deg,#ffe500 50%,#121 25%)',
    'background:linear-gradient(45deg,#ffe500 50%,#121 0)'
);

test(
    'linear: should not reduce length values with different units',
    passthroughCSS,
    'background:linear-gradient(45deg,#ffe500 25px,#121 20%)'
);

test(
    'linear: should remove the (unnecessary) start/end length values',
    processCSS,
    'background:linear-gradient(#ffe500 0%,#121 100%)',
    'background:linear-gradient(#ffe500,#121)'
);

test(
    'repeating-radial: should reduce length values if they are the same',
    processCSS,
    'background:repeating-radial-gradient(#121,#121 5px,#ffe500 5px,#ffe500 10px)',
    'background:repeating-radial-gradient(#121,#121 5px,#ffe500 0,#ffe500 10px)'
);

test(
    'radial: should correctly account for "at"',
    passthroughCSS,
    'background:radial-gradient(at 50% 0%,rgba(74,74,74,.15),transparent 40%);'
);

test(
    'radial: should correctly account for "at" (2)',
    processCSS,
    'background:radial-gradient(at 50% 0%,rgba(74,74,74,.15),transparent 40%, red 40%);',
    'background:radial-gradient(at 50% 0%,rgba(74,74,74,.15),transparent 40%, red 0);'
);

test(
    'radial: should correctly account without "at"',
    processCSS,
    'background: radial-gradient(50% 26%, circle, #fff, rgba(255, 255, 255, 0) 24%)',
    'background: radial-gradient(50% 26%, circle, #fff, rgba(255, 255, 255, 0) 24%)',
);

test(
    'radial: should correctly account without "at" (2)',
    processCSS,
    'background: radial-gradient(50% 26%, circle, #fff 30%, rgba(255, 255, 255, 0) 24%)',
    'background: radial-gradient(50% 26%, circle, #fff 30%, rgba(255, 255, 255, 0) 0)',
);

test(
    'should not mangle floating point numbers',
    processCSS,
    'background:linear-gradient(#fff,#fff 2em,#ccc 2em,#ccc 2.1em,#fff 2.1em)',
    'background:linear-gradient(#fff,#fff 2em,#ccc 0,#ccc 2.1em,#fff 0)'
);

test(
    'should not remove the trailing zero if it is the last stop',
    passthroughCSS,
    'background: linear-gradient(90deg,transparent,#00aeef 0)'
);

test(
    'should not remove point number if it its different type from a previous one',
    passthroughCSS,
    'background: linear-gradient(to left bottom,transparent calc(50% - 2px),#a7a7a8 0,#a7a7a8 calc(50% + 2px),transparent 0)'
);

test(
    'should not throw on empty linear gradients',
    passthroughCSS,
    'background: linear-gradient()'
);

test(
    'should not throw on empty radial gradients',
    passthroughCSS,
    'background: radial-gradient()',
);

test(
    'should pass through custom property references',
    passthroughCSS,
    'background-image:var(--bg),linear-gradient(red,blue)'
);

test(
    'should not operate on declarations without gradients',
    passthroughCSS,
    'background:red'
);

test(
    'should use the postcss plugin api',
    usePostCSSPlugin,
    plugin()
);
