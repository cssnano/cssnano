'use strict';

module.exports.name = 'cssnano/postcss-convert-values';
module.exports.tests = [{
    message: 'should convert milliseconds to seconds',
    fixture: 'h1{transition-duration:500ms}',
    expected: 'h1{transition-duration:.5s}'
}, {
    message: 'should not convert negative milliseconds to seconds',
    fixture: 'h1{animation-duration:-569ms}',
    expected: 'h1{animation-duration:-569ms}'
}, {
    message: 'should not remove the unit from zero values (duration)',
    fixture: 'h1{transition-duration:0s}',
    expected: 'h1{transition-duration:0s}'
}, {
    message: 'should remove unnecessary plus signs',
    fixture: 'h1{width:+14px}',
    expected: 'h1{width:14px}'
}, {
    message: 'should convert px to pc',
    fixture: 'h1{width:16px}',
    expected: 'h1{width:1pc}'
}, {
    message: 'should convert px to pt',
    fixture: 'h1{width:120px}',
    expected: 'h1{width:90pt}'
}, {
    message: 'should convert px to in',
    fixture: 'h1{width:192px}',
    expected: 'h1{width:2in}'
}, {
    message: 'should strip the units from length properties',
    fixture: 'h1{margin:0em 0% 0px 0pc}',
    expected: 'h1{margin:0}'
}, {
    message: 'should trim trailing zeros',
    fixture: 'h1{width:109.00000000000px}',
    expected: 'h1{width:109px}'
}, {
    message: 'should trim trailing zeros + unit',
    fixture: 'h1{width:0.00px}',
    expected: 'h1{width:0}'
}, {
    message: 'should not mangle flex basis',
    fixture: 'h1{flex-basis:0%}',
    expected: 'h1{flex-basis:0%}'
}, {
    message: 'should not mangle values without units',
    fixture: 'h1{z-index:1}',
    expected: 'h1{z-index:1}'
}, {
    message: 'should operate in calc values',
    fixture: 'h1{width:calc(192px + 2em)}',
    expected: 'h1{width:calc(2in + 2em)}'
}, {
    message: 'should not mangle values outside of its domain',
    fixture: 'h1{background:url(a.png)}',
    expected: 'h1{background:url(a.png)}'
}, {
    message: 'should optimise fractions',
    fixture: 'h1{opacity:1.}h2{opacity:.0}',
    expected: 'h1{opacity:1}h2{opacity:0}'
}, {
    message: 'should optimise fractions with units',
    fixture: 'h1{width:10.px}h2{width:.0px}',
    expected: 'h1{width:10px}h2{width:0}'
}, {
    message: 'should optimise fractions inside calc',
    fixture: 'h1{width:calc(10.px + .0px)}',
    expected: 'h1{width:10px}'
}, {
    message: 'should handle leading zero in rem values',
    fixture: '.one{top:0.25rem}',
    expected: '.one{top:.25rem}'
}, {
    message: 'should handle slash separated values',
    fixture: '.one{background:50% .0%/100.0% 100.0%}',
    expected: '.one{background:50% 0/100% 100%}'
}, {
    message: 'should handle comma separated values',
    fixture: '.one{background:50% .0%,100.0% 100.0%}',
    expected: '.one{background:50% 0,100% 100%}'
}, {
    message: 'should not mangle duration values',
    fixture: '.long{animation-duration:2s}',
    expected: '.long{animation-duration:2s}'
}, {
    message: 'should not mangle padding values',
    fixture: 'h1{padding:10px 20px 30px 40px}h2{padding:10px 20px 30px}h3{padding:10px 20px}h4{padding:10px}',
    expected: 'h1{padding:10px 20px 30px 40px}h2{padding:10px 20px 30px}h3{padding:10px 20px}h4{padding:10px}'
}, {
    message: 'should trim leading zeroes from negative values',
    fixture: 'h1,h2{letter-spacing:-0.1rem}',
    expected: 'h1,h2{letter-spacing:-.1rem}'
}, {
    message: 'should support viewports units',
    fixture: 'h1,h2{letter-spacing:-0.1vmin}',
    expected: 'h1,h2{letter-spacing:-.1vmin}'
}];
