import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Variables passthrough', () => {
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
    'should pass through uppercase VAR()',
    passthroughCSS('h1{transform:scale(VAR(--foo), VAR(--foo))}')
  );
});

describe('Variables reduction', () => {
  test(
    'keeps a 2D matrix3d() with variables',
    passthroughCSS(
      'h1{transform:matrix3d(var(--a), var(--b), 0, 0, var(--c), var(--d), 0, 0, 0, 0, 1, 0, var(--tx), var(--ty), 0, 1)}'
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
    'keeps z-axis rotate3d() with variables',
    passthroughCSS('h1{transform:rotate3d(0, 0, 1, var(--foo))}')
  );

  test(
    'keeps rotateZ() with variables',
    passthroughCSS('h1{transform:rotateZ(var(--foo))}')
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
    'keeps x-axis scale3d() with variables',
    passthroughCSS('h1{transform:scale3d(var(--foo), 1, 1)}')
  );

  test(
    'keeps y-axis scale3d() with variables',
    passthroughCSS('h1{transform:scale3d(1, var(--foo), 1)}')
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
    'keeps var() references whose custom-property names differ only in case',
    passthroughCSS('h1{transform:scale(var(--Foo), var(--foo))}')
  );

  test(
    'keeps a var() reference beside an env() reference with a matching name',
    passthroughCSS('h1{transform:scale(var(--foo), env(--foo))}')
  );

  test(
    'keeps an env() reference beside a var() reference with a matching name',
    passthroughCSS('h1{transform:scale(env(--foo), var(--foo))}')
  );

  test(
    'reduces equal var() references with mixed-case custom-property names',
    processCSS(
      'h1{transform:scale(var(--Foo), var(--Foo))}',
      'h1{transform:scale(var(--Foo))}'
    )
  );
});

describe('Variable fallbacks', () => {
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
});
