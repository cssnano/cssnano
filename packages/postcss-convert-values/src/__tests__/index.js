'use strict';

import test from 'tape';
import postcss from 'postcss';
import plugin from '..';
import {name} from '../../package.json';

let tests = [{
    message: 'should convert milliseconds to seconds',
    fixture: 'h1{transition-duration:500ms}',
    expected: 'h1{transition-duration:.5s}'
}, {
    message: 'should convert seconds to milliseconds',
    fixture: 'h1{transition-duration:.005s}',
    expected: 'h1{transition-duration:5ms}'
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
    message: 'should not convert in to px',
    fixture: 'h1{width:192in}',
    expected: 'h1{width:192in}'
}, {
    message: 'should strip the units from length properties',
    fixture: 'h1{margin: 0em 0% 0px 0pc}',
    expected: 'h1{margin: 0 0 0 0}'
}, {
    message: 'should trim trailing zeros',
    fixture: 'h1{width:109.00000000000px}',
    expected: 'h1{width:109px}'
}, {
    message: 'should trim trailing zeros + unit',
    fixture: 'h1{width:0.00px}',
    expected: 'h1{width:0}'
}, {
    message: 'should trim trailing zeros without unit',
    fixture: 'h1{width:100.00%}',
    expected: 'h1{width:100%}'
}, {
    message: 'should not mangle flex basis',
    fixture: 'h1{flex-basis:0%}',
    expected: 'h1{flex-basis:0%}'
}, {
    message: 'should not mangle values without units',
    fixture: 'h1{z-index:5}',
    expected: 'h1{z-index:5}'
}, {
    message: 'should operate in calc values',
    fixture: 'h1{width:calc(192px + 2em - (0px * 4))}',
    expected: 'h1{width:calc(2in + 2em - (0px * 4))}'
}, {
    message: 'should not convert zero values in calc',
    fixture: 'h1{width:calc(0em)}',
    expected: 'h1{width:calc(0em)}'
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
    expected: 'h1{width:calc(10px + 0px)}'
}, {
    message: 'should handle leading zero in rem values',
    fixture: '.one{top:0.25rem}',
    expected: '.one{top:.25rem}'
}, {
    message: 'should handle slash separated values',
    fixture: '.one{background: 50% .0%/100.0% 100.0%}',
    expected: '.one{background: 50% 0/100% 100%}'
}, {
    message: 'should handle comma separated values',
    fixture: '.one{background: 50% .0% ,100.0% 100.0%}',
    expected: '.one{background: 50% 0 ,100% 100%}'
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
}, {
    message: 'should support ch units',
    fixture: 'a{line-height:1.1ch}',
    expected: 'a{line-height:1.1ch}'
}, {
    message: 'should support PX units',
    fixture: 'h1{font-size:20PX}',
    expected: 'h1{font-size:20px}'
}, {
    message: 'should not mangle data urls',
    fixture: '.has-svg:before{content:url("data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="-0.5 0 20 15"><rect fill="white" stroke="none" transform="rotate(45 4.0033 8.87436)" height="5" width="6.32304" y="6.37436" x="0.84178"></rect><rect fill="white" stroke="none" transform="rotate(45 11.1776 7.7066)" width="5" height="16.79756" y="-0.69218" x="8.67764"></rect></svg>")}',
    expected: '.has-svg:before{content:url("data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="-0.5 0 20 15"><rect fill="white" stroke="none" transform="rotate(45 4.0033 8.87436)" height="5" width="6.32304" y="6.37436" x="0.84178"></rect><rect fill="white" stroke="none" transform="rotate(45 11.1776 7.7066)" width="5" height="16.79756" y="-0.69218" x="8.67764"></rect></svg>")}'
}, {
    message: 'should convert angle units',
    fixture: 'h1{transform: rotate(0.25turn);transform: rotate(0.25TURN)}',
    expected: 'h1{transform: rotate(90deg);transform: rotate(90deg)}'
}, {
    message: 'should not convert length units',
    fixture: 'h1{transition-duration:500ms; width:calc(192px + 2em); width:+14px; letter-spacing:-0.1VMIN}',
    expected: 'h1{transition-duration:.5s; width:calc(192px + 2em); width:14px; letter-spacing:-.1vmin}',
    options: { length: false }
}, {
    message: 'should not convert time units',
    fixture: 'h1{transition-duration:500ms; width:calc(192px + 2em); width:+14px; letter-spacing:-0.1VMIN}',
    expected: 'h1{transition-duration:500ms; width:calc(2in + 2em); width:14px; letter-spacing:-.1vmin}',
    options: { time: false }
}, {
    message: 'should not convert angle units',
    fixture: 'h1{transform: rotate(0.25turn);transform: rotate(0.25TURN)}',
    expected: 'h1{transform: rotate(.25turn);transform: rotate(.25turn)}',
    options: { angle: false }
}, {
    message: 'should not convert length units with deprecated option',
    fixture: 'h1{transition-duration:500ms; width:calc(192px + 2em); width:+14px; letter-spacing:-0.1VMIN}',
    expected: 'h1{transition-duration:.5s; width:calc(192px + 2em); width:14px; letter-spacing:-.1vmin}',
    options: { convertLength: false }
}, {
    message: 'should not convert time units with deprecated option',
    fixture: 'h1{transition-duration:500ms; width:calc(192px + 2em); width:+14px; letter-spacing:-0.1VMIN}',
    expected: 'h1{transition-duration:500ms; width:calc(2in + 2em); width:14px; letter-spacing:-.1vmin}',
    options: { convertTime: false }
}, {
    message: 'should not remove units from angle values',
    fixture: 'h1{transform:rotate(0deg)}',
    expected: 'h1{transform:rotate(0deg)}'
}, {
    message: 'should not remove units from angle values (2)',
    fixture: 'h1{transform:rotate(0turn)}',
    expected: 'h1{transform:rotate(0turn)}'
}];

function process (css, options) {
    return postcss(plugin(options)).process(css).css;
}

test(name, t => {
    t.plan(tests.length);

    tests.forEach(test => {
        let options = test.options || {};
        t.equal(process(test.fixture, options), test.expected, test.message);
    });
});

test('should use the postcss plugin api', t => {
    t.plan(2);
    t.ok(plugin().postcssVersion, 'should be able to access version');
    t.equal(plugin().postcssPlugin, name, 'should be able to access name');
});
