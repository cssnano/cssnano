'use strict';

module.exports.name = 'cssnano/postcss-minify-gradients';
module.exports.tests = [{
    message: 'linear: should convert "to top" to 0deg',
    fixture: 'background:linear-gradient(to top,#ffe500,#121)',
    expected: 'background:linear-gradient(0deg,#ffe500,#121)'
}, {
    message: 'linear: should convert "to right" to 90deg',
    fixture: 'background:linear-gradient(to right,#ffe500,#121)',
    expected: 'background:linear-gradient(90deg,#ffe500,#121)'
}, {
    message: 'linear: should convert "to bottom" to 180deg',
    fixture: 'background:linear-gradient(to bottom,#ffe500,#121)',
    expected: 'background:linear-gradient(180deg,#ffe500,#121)'
}, {
    message: 'linear: should convert "to left" to 270deg',
    fixture: 'background:linear-gradient(to left,#ffe500,#121)',
    expected: 'background:linear-gradient(270deg,#ffe500,#121)'
}, {
    message: 'repeating-linear: should convert "to top" to 0deg',
    fixture: 'background:repeating-linear-gradient(to top,#ffe500,#121)',
    expected: 'background:repeating-linear-gradient(0deg,#ffe500,#121)'
}, {
    message: 'repeating-linear: should convert "to right" to 90deg',
    fixture: 'background:repeating-linear-gradient(to right,#ffe500,#121)',
    expected: 'background:repeating-linear-gradient(90deg,#ffe500,#121)'
}, {
    message: 'repeating-linear: should convert "to bottom" to 180deg',
    fixture: 'background:repeating-linear-gradient(to bottom,#ffe500,#121)',
    expected: 'background:repeating-linear-gradient(180deg,#ffe500,#121)'
}, {
    message: 'repeating-linear: should convert "to left" to 270deg',
    fixture: 'background:repeating-linear-gradient(to left,#ffe500,#121)',
    expected: 'background:repeating-linear-gradient(270deg,#ffe500,#121)'
}, {
    message: 'linear: should not convert "to top right" to an angle',
    fixture: 'background:linear-gradient(to top right,#ffe500,#121)',
    expected: 'background:linear-gradient(to top right,#ffe500,#121)'
}, {
    message: 'linear: should not convert "to bottom left" to an angle',
    fixture: 'background:linear-gradient(to bottom left,#ffe500,#121)',
    expected: 'background:linear-gradient(to bottom left,#ffe500,#121)'
}, {
    message: 'linear: should reduce length values if they are the same',
    fixture: 'background:linear-gradient(45deg,#ffe500 50%,#121 50%)',
    expected: 'background:linear-gradient(45deg,#ffe500 50%,#121 0)'
}, {
    message: 'linear: should reduce length values if they are less',
    fixture: 'background:linear-gradient(45deg,#ffe500 50%,#121 25%)',
    expected: 'background:linear-gradient(45deg,#ffe500 50%,#121 0)'
}, {
    message: 'linear: should not reduce length values with different units',
    fixture: 'background:linear-gradient(45deg,#ffe500 25px,#121 20%)',
    expected: 'background:linear-gradient(45deg,#ffe500 25px,#121 20%)'
}, {
    message: 'linear: should remove the (unnecessary) start/end length values',
    fixture: 'background:linear-gradient(#ffe500 0%,#121 100%)',
    expected: 'background:linear-gradient(#ffe500,#121)'
}, {
    message: 'repeating-radial: should reduce length values if they are the same',
    fixture: 'background:repeating-radial-gradient(#121,#121 5px,#ffe500 5px,#ffe500 10px)',
    expected: 'background:repeating-radial-gradient(#121,#121 5px,#ffe500 0,#ffe500 10px)'
}];
