'use strict';

import test from 'tape';
import postcss from 'postcss';
import plugin from '..';
import {name} from '../../package.json';

let tests = [{
    message: 'should order border consistently',
    fixture: 'h1{border:1px solid red;border:1px red solid;border:solid 1px red;border:solid red 1px;border:red solid 1px;border:red 1px solid}',
    expected: 'h1{border:1px solid red;border:1px solid red;border:1px solid red;border:1px solid red;border:1px solid red;border:1px solid red}'
}, {
    message: 'should order border with two properties',
    fixture: 'h1{border:solid 1px}',
    expected: 'h1{border:1px solid}'
}, {
    message: 'should order border with color functions',
    fixture: 'h1{border:rgba(255,255,255,0.5) dashed thick}',
    expected: 'h1{border:thick dashed rgba(255,255,255,0.5)}',
}, {
    message: 'should order border longhand',
    fixture: 'h1{border-left:solid 2px red;border-right:#fff 3px dashed;border-top:dotted #000 1px;border-bottom:4px navy groove}',
    expected: 'h1{border-left:2px solid red;border-right:3px dashed #fff;border-top:1px dotted #000;border-bottom:4px groove navy}',
}, {
    message: 'should skip inherit',
    fixture: 'h1{border:inherit}',
    expected: 'h1{border:inherit}'
}, {
    message: 'should order outline consistently',
    fixture: 'h1{outline:solid red 1px}',
    expected: 'h1{outline:1px solid red}'
}];

function process (css, options) {
    return postcss(plugin(options)).process(css).css;
}

test(name, t => {
    t.plan(tests.length);

    tests.forEach(test => {
        var options = test.options || {};
        t.equal(process(test.fixture, options), test.expected, test.message);
    });
});

test('should use the postcss plugin api', t => {
    t.plan(2);
    t.ok(plugin().postcssVersion, 'should be able to access version');
    t.equal(plugin().postcssPlugin, name, 'should be able to access name');
});