import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Preserves 3D-transformed classification', () => {
  test(
    'keeps matrix3d() that describes a 2D matrix',
    passthroughCSS(
      'h1{transform:matrix3d(20, 20, 0, 0, 40, 40, 0, 0, 0, 0, 1, 0, 80, 80, 0, 1)}'
    )
  );

  test(
    'keeps matrix3d() with an uppercase property name',
    passthroughCSS(
      'h1{TRANSFORM:matrix3d(20, 20, 0, 0, 40, 40, 0, 0, 0, 0, 1, 0, 80, 80, 0, 1)}'
    )
  );

  test(
    'keeps matrix3d() with an uppercase function name',
    passthroughCSS(
      'h1{TRANSFORM:MATRIX3D(20, 20, 0, 0, 40, 40, 0, 0, 0, 0, 1, 0, 80, 80, 0, 1)}'
    )
  );

  test(
    'should pass through other 3d matrices',
    passthroughCSS(
      'h1{transform:matrix3d(.8535533905932737,.4999999999999999,.14644660940672619,0,-.4999999999999999,.7071067811865476,.4999999999999999,0,.14644660940672619,-.4999999999999999,.8535533905932737,0,22.62994231491119,-20.3223304703363,101.3700576850888,1)}'
    )
  );
});

describe('Reduces equivalent 3D transform functions', () => {
  test('keeps rotateZ()', passthroughCSS('h1{transform:rotateZ(180deg)}'));

  test(
    'keeps rotateZ() with an uppercase function name',
    passthroughCSS('h1{transform:ROTATEZ(180deg)}')
  );

  test(
    'reduces x-axis rotate3d() to rotateX()',
    processCSS(
      'h1{transform:rotate3d(1, 0, 0, 20deg)}',
      'h1{transform:rotateX(20deg)}'
    )
  );

  test(
    'reduces x-axis rotate3d() with an uppercase function name',
    processCSS(
      'h1{transform:ROTATE3D(1, 0, 0, 20deg)}',
      'h1{transform:rotateX(20deg)}'
    )
  );

  test(
    'reduces y-axis rotate3d() to rotateY()',
    processCSS(
      'h1{transform:rotate3d(0, 1, 0, 20deg)}',
      'h1{transform:rotateY(20deg)}'
    )
  );

  test(
    'keeps z-axis rotate3d()',
    passthroughCSS('h1{transform:rotate3d(0, 0, 1, 20deg)}')
  );

  test(
    'should pass through other rotate3d arguments',
    passthroughCSS('h1{transform:rotate3d(1.5, 1.5, 0, 45deg)}')
  );
});

describe('Scale reductions', () => {
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
    'keeps x-axis scale3d()',
    passthroughCSS('h1{transform:scale3d(1.5, 1, 1)}')
  );

  test(
    'keeps y-axis scale3d()',
    passthroughCSS('h1{transform:scale3d(1, 1.5, 1)}')
  );

  test(
    'reduces z-axis scale3d() to scaleZ()',
    processCSS('h1{transform:scale3d(1, 1, 1.5)}', 'h1{transform:scaleZ(1.5)}')
  );

  test(
    'should pass through other scale3d arguments',
    passthroughCSS('h1{transform:scale3d(1.5, 1.5, 3)}')
  );
});

describe('Translate reductions', () => {
  test(
    'should pass through translate with 1 argument',
    passthroughCSS('h1{transform:translate(5)}')
  );

  test(
    'should not shorten translate(tx, ty) to translate(tx)',
    passthroughCSS('h1{transform:translate(5, 5)}')
  );

  test(
    'should shorten translate(0px, ty) to translateY(ty)',
    processCSS(
      'h1{transform:translate(0px, 5px)}',
      'h1{transform:translateY(5px)}'
    )
  );

  test(
    'should shorten translate(0em, ty) to translateY(ty)',
    processCSS(
      'h1{transform:translate(0em, 5px)}',
      'h1{transform:translateY(5px)}'
    )
  );

  test(
    'should shorten translate(0%, ty) to translateY(ty)',
    processCSS(
      'h1{transform:translate(0%, 5px)}',
      'h1{transform:translateY(5px)}'
    )
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
    'reduces translate3d() to translateZ()',
    processCSS(
      'h1{transform:translate3d(0, 0, 2)}',
      'h1{transform:translateZ(2)}'
    )
  );

  test(
    'should pass through other translate3d arguments',
    passthroughCSS('h1{transform:translate3d(1.5,1.5,3)}')
  );
});

describe('Vendor-prefixed 3D transforms', () => {
  test(
    'reduces vendor-prefixed 3D transforms',
    processCSS(
      'h1{-webkit-transform:translate3d(0, 0, 0)}',
      'h1{-webkit-transform:translateZ(0)}'
    )
  );

  test(
    'reduces Mozilla-prefixed 3D transforms',
    processCSS(
      'h1{-moz-transform:translate3d(0, 0, 0)}',
      'h1{-moz-transform:translateZ(0)}'
    )
  );

  test(
    'reduces vendor-prefixed 3D transforms with uppercase properties',
    processCSS(
      'h1{-WEBKIT-TRANSFORM:translate3d(0, 0, 0)}',
      'h1{-WEBKIT-TRANSFORM:translateZ(0)}'
    )
  );

  test(
    'reduces vendor-prefixed 3D transforms with uppercase values',
    processCSS(
      'h1{-WEBKIT-TRANSFORM:TRANSLATE3D(0, 0, 0)}',
      'h1{-WEBKIT-TRANSFORM:translateZ(0)}'
    )
  );
});

test(
  'should not match a Unicode lookalike transform property',
  passthroughCSS('h1{tranſform:scale(1,1)}')
);
