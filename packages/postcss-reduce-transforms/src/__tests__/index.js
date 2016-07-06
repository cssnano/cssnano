import test from 'ava';
import postcss from 'postcss';
import plugin from '../';
import {name} from '../../package.json';

const tests = [{
    message: 'should shorten matrix3d(a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1) to matrix(a, b, c, d, tx, ty)',
    fixture: 'h1{transform:matrix3d(20, 20, 0, 0, 40, 40, 0, 0, 0, 0, 1, 0, 80, 80, 0, 1)}',
    expected: 'h1{transform:matrix(20, 20, 40, 40, 80, 80)}',
}, {
    message: 'should shorten rotateZ to rotate',
    fixture: 'h1{transform:rotateZ(180deg)}',
    expected: 'h1{transform:rotate(180deg)}',
}, {
    message: 'should shorten rotate3d(1, 0, 0, a) to rotateX(a)',
    fixture: 'h1{transform:rotate3d(1, 0, 0, 20deg)}',
    expected: 'h1{transform:rotateX(20deg)}',
}, {
    message: 'should shorten rotate3d(0, 1, 0, a) to rotateY(a)',
    fixture: 'h1{transform:rotate3d(0, 1, 0, 20deg)}',
    expected: 'h1{transform:rotateY(20deg)}',
}, {
    message: 'should shorten rotate3d(0, 0, 1, a) to rotate(a)',
    fixture: 'h1{transform:rotate3d(0, 0, 1, 20deg)}',
    expected: 'h1{transform:rotate(20deg)}',
}, {
    message: 'should shorten scale(sx, sy) to scale(sx)',
    fixture: 'h1{transform:scale(1.5, 1.5)}',
    expected: 'h1{transform:scale(1.5)}',
}, {
    message: 'should shorten scale(sx, 1) to scaleX(sx)',
    fixture: 'h1{transform:scale(1.5, 1)}',
    expected: 'h1{transform:scaleX(1.5)}',
}, {
    message: 'should shorten scale(1, sy) to scaleY(sy)',
    fixture: 'h1{transform:scale(1, 1.5)}',
    expected: 'h1{transform:scaleY(1.5)}',
}, {
    message: 'should shorten scale3d(sx, 1, 1) to scaleX(sx)',
    fixture: 'h1{transform:scale(1.5, 1, 1)}',
    expected: 'h1{transform:scaleX(1.5)}',
}, {
    message: 'should shorten scale3d(1, sy, 1) to scaleY(sy)',
    fixture: 'h1{transform:scale(1, 1.5, 1)}',
    expected: 'h1{transform:scaleY(1.5)}',
}, {
    message: 'should shorten scale3d(1, 1, sz) to scaleZ(sz)',
    fixture: 'h1{transform:scale3d(1, 1, 1.5)}',
    expected: 'h1{transform:scaleZ(1.5)}',
}, {
    message: 'should not shorten translate(tx, ty) to translate(tx)',
    fixture: 'h1{transform:translate(5, 5)}',
    expected: 'h1{transform:translate(5, 5)}',
}, {
    message: 'should shorten translate(tx, 0) to translate(tx)',
    fixture: 'h1{transform:translate(5, 0)}',
    expected: 'h1{transform:translate(5)}',
}, {
    message: 'should shorten translate(0, ty) to translateY(ty)',
    fixture: 'h1{transform:translate(0, 5)}',
    expected: 'h1{transform:translateY(5)}',
}, {
    message: 'should shorten translate3d(0, 0, tz) to translateZ(tz)',
    fixture: 'h1{transform:translate3d(0, 0, 2)}',
    expected: 'h1{transform:translateZ(2)}',
}, {
    message: 'should work with vendor prefixes',
    fixture: 'h1{-webkit-transform:translate3d(0, 0, 0)}',
    expected: 'h1{-webkit-transform:translateZ(0)}',
}];

tests.forEach(({message, fixture, expected, options = {}}) => {
    test(message, t => {
        return postcss(plugin(options)).process(fixture).then(({css}) => {
            t.deepEqual(css, expected);
        });
    });
});

test('should use the postcss plugin api', t => {
    t.truthy(plugin().postcssVersion, 'should be able to access version');
    t.deepEqual(plugin().postcssPlugin, name, 'should be able to access name');
});
