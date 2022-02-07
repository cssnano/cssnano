'use strict';
const { test } = require('uvu');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');

const plugin = require('../src/index.js');

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should shorten matrix3d(a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1) to matrix(a, b, c, d, tx, ty)',
  processCSS(
    'h1{transform:matrix3d(20, 20, 0, 0, 40, 40, 0, 0, 0, 0, 1, 0, 80, 80, 0, 1)}',
    'h1{transform:matrix(20, 20, 40, 40, 80, 80)}'
  )
);

test(
  'should shorten matrix3d(a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1) to matrix(a, b, c, d, tx, ty) (uppercase property)',
  processCSS(
    'h1{TRANSFORM:matrix3d(20, 20, 0, 0, 40, 40, 0, 0, 0, 0, 1, 0, 80, 80, 0, 1)}',
    'h1{TRANSFORM:matrix(20, 20, 40, 40, 80, 80)}'
  )
);

test(
  'should shorten matrix3d(a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1) to matrix(a, b, c, d, tx, ty) (uppercase value)',
  processCSS(
    'h1{TRANSFORM:MATRIX3D(20, 20, 0, 0, 40, 40, 0, 0, 0, 0, 1, 0, 80, 80, 0, 1)}',
    'h1{TRANSFORM:matrix(20, 20, 40, 40, 80, 80)}'
  )
);

test(
  'should pass through other 3d matrices',
  passthroughCSS(
    'h1{transform:matrix3d(.8535533905932737,.4999999999999999,.14644660940672619,0,-.4999999999999999,.7071067811865476,.4999999999999999,0,.14644660940672619,-.4999999999999999,.8535533905932737,0,22.62994231491119,-20.3223304703363,101.3700576850888,1)}'
  )
);

test(
  'should shorten rotateZ to rotate',
  processCSS('h1{transform:rotateZ(180deg)}', 'h1{transform:rotate(180deg)}')
);

test(
  'should shorten rotateZ to rotate (uppercase value)',
  processCSS('h1{transform:ROTATEZ(180deg)}', 'h1{transform:rotate(180deg)}')
);

test(
  'should shorten rotate3d(1, 0, 0, a) to rotateX(a)',
  processCSS(
    'h1{transform:rotate3d(1, 0, 0, 20deg)}',
    'h1{transform:rotateX(20deg)}'
  )
);

test(
  'should shorten rotate3d(1, 0, 0, a) to rotateX(a) (uppercase value)',
  processCSS(
    'h1{transform:ROTATE3D(1, 0, 0, 20deg)}',
    'h1{transform:rotateX(20deg)}'
  )
);

test(
  'should shorten rotate3d(0, 1, 0, a) to rotateY(a)',
  processCSS(
    'h1{transform:rotate3d(0, 1, 0, 20deg)}',
    'h1{transform:rotateY(20deg)}'
  )
);

test(
  'should shorten rotate3d(0, 0, 1, a) to rotate(a)',
  processCSS(
    'h1{transform:rotate3d(0, 0, 1, 20deg)}',
    'h1{transform:rotate(20deg)}'
  )
);

test(
  'should pass through other rotate3d arguments',
  passthroughCSS('h1{transform:rotate3d(1.5, 1.5, 0, 45deg)}')
);

test(
  'should shorten scale(0, 0) to scale(0)',
  processCSS('h1{transform:scale(0, 0)}', 'h1{transform:scale(0)}')
);

test(
  'should shorten scale(sx, sy) to scale(sx)',
  processCSS('h1{transform:scale(1.5, 1.5)}', 'h1{transform:scale(1.5)}')
);

test(
  'should shorten scale(sx, 1) to scaleX(sx)',
  processCSS('h1{transform:scale(1.5, 1)}', 'h1{transform:scaleX(1.5)}')
);

test(
  'should shorten scale(1, sy) to scaleY(sy)',
  processCSS('h1{transform:scale(1, 1.5)}', 'h1{transform:scaleY(1.5)}')
);

test(
  'should pass through 1 argument scale',
  passthroughCSS('h1{transform:scale(1.5)}')
);

test(
  'should pass through 2 different arguments scale',
  passthroughCSS('h1{transform:scale(1.5,3)}')
);

test(
  'should shorten scale3d(sx, 1, 1) to scaleX(sx)',
  processCSS('h1{transform:scale3d(1.5, 1, 1)}', 'h1{transform:scaleX(1.5)}')
);

test(
  'should shorten scale3d(1, sy, 1) to scaleY(sy)',
  processCSS('h1{transform:scale3d(1, 1.5, 1)}', 'h1{transform:scaleY(1.5)}')
);

test(
  'should shorten scale3d(1, 1, sz) to scaleZ(sz)',
  processCSS('h1{transform:scale3d(1, 1, 1.5)}', 'h1{transform:scaleZ(1.5)}')
);

test(
  'should pass through other scale3d arguments',
  passthroughCSS('h1{transform:scale3d(1.5, 1.5, 3)}')
);

test(
  'should pass through translate with 1 argument',
  passthroughCSS('h1{transform:translate(5)}')
);

test(
  'should not shorten translate(tx, ty) to translate(tx)',
  processCSS('h1{transform:translate(5, 5)}', 'h1{transform:translate(5, 5)}')
);

test(
  'should shorten translate(tx, 0) to translate(tx)',
  processCSS('h1{transform:translate(5, 0)}', 'h1{transform:translate(5)}')
);

test(
  'should shorten translate(0, ty) to translateY(ty)',
  processCSS('h1{transform:translate(0, 5)}', 'h1{transform:translateY(5)}')
);

test(
  'should shorten translate3d(0, 0, tz) to translateZ(tz)',
  processCSS(
    'h1{transform:translate3d(0, 0, 2)}',
    'h1{transform:translateZ(2)}'
  )
);

test(
  'should pass through other translate3d arguments',
  passthroughCSS('h1{transform:translate3d(1.5,1.5,3)}')
);

test(
  'should work with vendor prefixes',
  processCSS(
    'h1{-webkit-transform:translate3d(0, 0, 0)}',
    'h1{-webkit-transform:translateZ(0)}'
  )
);

test(
  'should work with vendor prefixes #1',
  processCSS(
    'h1{-moz-transform:translate3d(0, 0, 0)}',
    'h1{-moz-transform:translateZ(0)}'
  )
);

test(
  'should work with vendor prefixes (uppercase property)',
  processCSS(
    'h1{-WEBKIT-TRANSFORM:translate3d(0, 0, 0)}',
    'h1{-WEBKIT-TRANSFORM:translateZ(0)}'
  )
);

test(
  'should work with vendor prefixes (uppercase value)',
  processCSS(
    'h1{-WEBKIT-TRANSFORM:TRANSLATE3D(0, 0, 0)}',
    'h1{-WEBKIT-TRANSFORM:translateZ(0)}'
  )
);

test(
  'should pass through variables',
  passthroughCSS('h1{transform:var(--foo)}')
);

test(
  'should pass through variables #1',
  passthroughCSS('h1{transform:matrix3d(var(--foo))}')
);

test(
  'should pass through variables #2',
  passthroughCSS(
    'h1{transform:matrix3d(var(--a1), var(--a2), var(--a3), var(--a4))}'
  )
);

test(
  'should pass through variables #3',
  passthroughCSS(
    'h1{transform:matrix3d(var(--a1), var(--b1), var(--c1), var(--d1), var(--a2), var(--b2), var(--c2), var(--d2), var(--a3), var(--b3), var(--c3), var(--d3), var(--a4), var(--b4), var(--c4), var(--d4))}'
  )
);

test(
  'should pass through variables #4',
  passthroughCSS('h1{transform:rotate3d(var(--foo))}')
);

test(
  'should pass through variables #5',
  passthroughCSS(
    'h1{transform:rotate3d(var(--x), var(--y), var(--z), var(--a))}'
  )
);

test(
  'should pass through variables #6',
  passthroughCSS('h1{transform:scale(var(--foo))}')
);

test(
  'should pass through variables #7',
  passthroughCSS('h1{transform:scale(var(--foo), var(--bar))}')
);

test(
  'should pass through variables #8',
  passthroughCSS('h1{transform:scale3d(var(--foo))}')
);

test(
  'should pass through variables #9',
  passthroughCSS('h1{transform:scale3d(var(--foo), var(--bar), var(--baz))}')
);

test(
  'should pass through variables #10',
  passthroughCSS('h1{transform:translate(var(--foo))}')
);

test(
  'should pass through variables #11',
  passthroughCSS('h1{transform:translate(var(--foo), var(--bar))}')
);

test(
  'should pass through variables #12',
  passthroughCSS('h1{transform:translate3d(var(--foo))}')
);

test(
  'should pass through variables #13',
  passthroughCSS(
    'h1{transform:translate3d(var(--foo), var(--bar), var(--baz))}'
  )
);

test(
  'should work with variables',
  processCSS(
    'h1{transform:matrix3d(var(--a), var(--b), 0, 0, var(--c), var(--d), 0, 0, 0, 0, 1, 0, var(--tx), var(--ty), 0, 1)}',
    'h1{transform:matrix(var(--a), var(--b), var(--c), var(--d), var(--tx), var(--ty))}'
  )
);

test(
  'should work with variables #1',
  processCSS(
    'h1{transform:rotate3d(1, 0, 0, var(--foo))}',
    'h1{transform:rotateX(var(--foo))}'
  )
);

test(
  'should work with variables #2',
  processCSS(
    'h1{transform:rotate3d(0, 1, 0, var(--foo))}',
    'h1{transform:rotateY(var(--foo))}'
  )
);

test(
  'should work with variables #3',
  processCSS(
    'h1{transform:rotate3d(0, 0, 1, var(--foo))}',
    'h1{transform:rotate(var(--foo))}'
  )
);

test(
  'should work with variables #4',
  processCSS(
    'h1{transform:rotateZ(var(--foo))}',
    'h1{transform:rotate(var(--foo))}'
  )
);

test(
  'should work with variables #5',
  processCSS(
    'h1{transform:scale(var(--foo), var(--foo))}',
    'h1{transform:scale(var(--foo))}'
  )
);

test(
  'should work with variables #6',
  processCSS(
    'h1{transform:scale(var(--foo), var(   --foo   ))}',
    'h1{transform:scale(var(--foo))}'
  )
);

test(
  'should work with variables #7',
  processCSS(
    'h1{transform:scale(var(--foo), 1)}',
    'h1{transform:scaleX(var(--foo))}'
  )
);

test(
  'should work with variables #8',
  processCSS(
    'h1{transform:scale(1, var(--foo))}',
    'h1{transform:scaleY(var(--foo))}'
  )
);

test(
  'should work with variables #9',
  processCSS(
    'h1{transform:scale3d(var(--foo), 1, 1)}',
    'h1{transform:scaleX(var(--foo))}'
  )
);

test(
  'should work with variables #10',
  processCSS(
    'h1{transform:scale3d(1, var(--foo), 1)}',
    'h1{transform:scaleY(var(--foo))}'
  )
);

test(
  'should work with variables #11',
  processCSS(
    'h1{transform:scale3d(1, 1, var(--foo))}',
    'h1{transform:scaleZ(var(--foo))}'
  )
);

test(
  'should work with variables #12',
  processCSS(
    'h1{transform:translate(var(--foo), 0)}',
    'h1{transform:translate(var(--foo))}'
  )
);

test(
  'should work with variables #13',
  processCSS(
    'h1{transform:translate(0, var(--foo))}',
    'h1{transform:translateY(var(--foo))}'
  )
);

test(
  'should work with variables #14',
  processCSS(
    'h1{transform:translate3d(0, 0, var(--foo))}',
    'h1{transform:translateZ(var(--foo))}'
  )
);

test(
  'should work with same env',
  processCSS(
    'h1{transform:scale(env(--foo), env(--foo))}',
    'h1{transform:scale(env(--foo))}'
  )
);

test(
  'should pass through with variables and difference fallback values',
  passthroughCSS('h1{transform:scale(var(--foo, 1), var(--foo, 2))}')
);

test(
  'should pass through with variables and difference fallback values #1',
  passthroughCSS(
    'h1{transform:scale(var(--foo, calc(1 * 5)), var(--foo, calc(1 + 1)))}'
  )
);

test(
  'should pass through with variables and difference fallback values #2',
  passthroughCSS(
    'h1{transform:scale(var(--foo, calc(1 * 1)), var(--foo, calc(1 + 1)))}'
  )
);

test(
  'should pass through invalid values',
  passthroughCSS(
    'h1{transform:matrix3d(20, 20, 0, 0, 40, 40, 0, 0, 0, 0, 1, 0, 80, 80, 0, 1, 1)}'
  )
);

test(
  'should pass through invalid values #1',
  passthroughCSS('h1{transform:rotate3d(1, 0, 0, 1, 1)}')
);

test(
  'should pass through invalid values #2',
  passthroughCSS('h1{transform:rotateZ(1, 1)}')
);

test(
  'should pass through invalid values #3',
  passthroughCSS('h1{transform:scale(1, 1, 1)}')
);

test(
  'should pass through invalid values #4',
  passthroughCSS('h1{transform:scale3d(1, 1, 1, 1)}')
);

test(
  'should pass through invalid values #5',
  passthroughCSS('h1{transform:translate(1, 0, 0)}')
);

test(
  'should pass through invalid values #6',
  passthroughCSS('h1{transform:translate3d(0, 0, var(--foo), 4)}')
);

test(
  'should pass through with calc',
  passthroughCSS('h1{transform:scale(calc(1 * 5), calc(1 + 1))}')
);

test(
  'should pass through broken var',
  passthroughCSS('h1{transform:scale(var(), var())}')
);

test('should pass through broken syntax', passthroughCSS('h1{transform:}'));

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

test(
  'should work with transform:rotate3d(0)',
  processCSS('h1{transform:rotate3d(0)}', 'h1{transform:rotate3d(0)}')
);
test.run();
