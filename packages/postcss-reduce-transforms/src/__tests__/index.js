import test from 'ava';
import plugin from '..';
import {usePostCSSPlugin, processCSSFactory} from '../../../../util/testHelpers';

const {processCSS, passthroughCSS} = processCSSFactory(plugin);

test(
     'should shorten matrix3d(a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1) to matrix(a, b, c, d, tx, ty)',
     processCSS,
     'h1{transform:matrix3d(20, 20, 0, 0, 40, 40, 0, 0, 0, 0, 1, 0, 80, 80, 0, 1)}',
     'h1{transform:matrix(20, 20, 40, 40, 80, 80)}'
);

test(
    'should pass through other 3d matrices',
    passthroughCSS,
    'h1{transform:matrix3d(.8535533905932737,.4999999999999999,.14644660940672619,0,-.4999999999999999,.7071067811865476,.4999999999999999,0,.14644660940672619,-.4999999999999999,.8535533905932737,0,22.62994231491119,-20.3223304703363,101.3700576850888,1)}'
);

test(
     'should shorten rotateZ to rotate',
     processCSS,
     'h1{transform:rotateZ(180deg)}',
     'h1{transform:rotate(180deg)}'
);

test(
     'should shorten rotate3d(1, 0, 0, a) to rotateX(a)',
     processCSS,
     'h1{transform:rotate3d(1, 0, 0, 20deg)}',
     'h1{transform:rotateX(20deg)}'
);

test(
     'should shorten rotate3d(0, 1, 0, a) to rotateY(a)',
     processCSS,
     'h1{transform:rotate3d(0, 1, 0, 20deg)}',
     'h1{transform:rotateY(20deg)}'
);

test(
     'should shorten rotate3d(0, 0, 1, a) to rotate(a)',
     processCSS,
     'h1{transform:rotate3d(0, 0, 1, 20deg)}',
     'h1{transform:rotate(20deg)}'
);

test(
    'should pass through other rotate3d arguments',
    passthroughCSS,
    'h1{transform:rotate3d(1.5, 1.5, 0, 45deg)}'
);

test(
     'should shorten scale(0, 0) to scale(0)',
     processCSS,
     'h1{transform:scale(0, 0)}',
     'h1{transform:scale(0)}'
);

test(
     'should shorten scale(sx, sy) to scale(sx)',
     processCSS,
     'h1{transform:scale(1.5, 1.5)}',
     'h1{transform:scale(1.5)}'
);

test(
     'should shorten scale(sx, 1) to scaleX(sx)',
     processCSS,
     'h1{transform:scale(1.5, 1)}',
     'h1{transform:scaleX(1.5)}'
);

test(
     'should shorten scale(1, sy) to scaleY(sy)',
     processCSS,
     'h1{transform:scale(1, 1.5)}',
     'h1{transform:scaleY(1.5)}'
);

test(
    'should pass through 1 argument scale',
    passthroughCSS,
    'h1{transform:scale(1.5)}'
);

test(
    'should pass through 2 different arguments scale',
    passthroughCSS,
    'h1{transform:scale(1.5,3)}'
);

test(
     'should shorten scale3d(sx, 1, 1) to scaleX(sx)',
     processCSS,
     'h1{transform:scale3d(1.5, 1, 1)}',
     'h1{transform:scaleX(1.5)}'
);

test(
     'should shorten scale3d(1, sy, 1) to scaleY(sy)',
     processCSS,
     'h1{transform:scale3d(1, 1.5, 1)}',
     'h1{transform:scaleY(1.5)}'
);

test(
     'should shorten scale3d(1, 1, sz) to scaleZ(sz)',
     processCSS,
     'h1{transform:scale3d(1, 1, 1.5)}',
     'h1{transform:scaleZ(1.5)}'
);

test(
    'should pass through other scale3d arguments',
    passthroughCSS,
    'h1{transform:scale3d(1.5, 1.5, 3)}'
);

test(
    'should pass through translate with 1 argument',
    passthroughCSS,
    'h1{transform:translate(5)}'
);

test(
     'should not shorten translate(tx, ty) to translate(tx)',
     processCSS,
     'h1{transform:translate(5, 5)}',
     'h1{transform:translate(5, 5)}'
);

test(
     'should shorten translate(tx, 0) to translate(tx)',
     processCSS,
     'h1{transform:translate(5, 0)}',
     'h1{transform:translate(5)}'
);

test(
     'should shorten translate(0, ty) to translateY(ty)',
     processCSS,
     'h1{transform:translate(0, 5)}',
     'h1{transform:translateY(5)}'
);

test(
     'should shorten translate3d(0, 0, tz) to translateZ(tz)',
     processCSS,
     'h1{transform:translate3d(0, 0, 2)}',
     'h1{transform:translateZ(2)}'
);

test(
    'should pass through other translate3d arguments',
    passthroughCSS,
    'h1{transform:translate3d(1.5,1.5,3)}'
);

test(
     'should work with vendor prefixes',
    processCSS,
    'h1{-webkit-transform:translate3d(0, 0, 0)}',
    'h1{-webkit-transform:translateZ(0)}'
);

test(
    'should work with vendor prefixes',
    processCSS,
    'h1{-webkit-transform:translate3d(0, 0, 0)}',
    'h1{-webkit-transform:translateZ(0)}'
);

test(
    'should pass through variables',
    passthroughCSS,
    'h1{transform:var(--foo)}'
);

test(
    'should use the postcss plugin api',
    usePostCSSPlugin,
    plugin()
);
