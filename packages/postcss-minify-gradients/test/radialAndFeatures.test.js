import { describe, test } from 'node:test';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Radial and webkit gradients', () => {
  test(
    'repeating-webkit-radial: should reduce length values if they are the same',
    processCSS(
      'background:-webkit-repeating-radial-gradient(#121,#121 5px,#ffe500 5px,#ffe500 10px)',
      'background:-webkit-repeating-radial-gradient(#121,#121 5px,#ffe500 0,#ffe500 10px)'
    )
  );

  test(
    'repeating-webkit-radial: should reduce length values with an uppercase function',
    processCSS(
      'background:-WEBKIT-REPEATING-RADIAL-GRADIENT(#121,#121 5PX,#FFE500 5PX,#FFE500 10PX)',
      'background:-WEBKIT-REPEATING-RADIAL-GRADIENT(#121,#121 5PX,#FFE500 0,#FFE500 10PX)'
    )
  );

  test(
    'repeating-radial: should reduce length values if they are the same',
    processCSS(
      'background:repeating-radial-gradient(#121,#121 5px,#ffe500 5px,#ffe500 10px)',
      'background:repeating-radial-gradient(#121,#121 5px,#ffe500 0,#ffe500 10px)'
    )
  );

  test(
    'repeating-radial: should reduce length values if they are the same (uppercase property and value)',
    processCSS(
      'BACKGROUND:REPEATING-RADIAL-GRADIENT(#121,#121 5PX,#FFE500 5PX,#FFE500 10PX)',
      'BACKGROUND:REPEATING-RADIAL-GRADIENT(#121,#121 5PX,#FFE500 0,#FFE500 10PX)'
    )
  );

  test(
    'repeating-radial: should reduce length values if they are the same (last is zero)',
    processCSS(
      'BACKGROUND:REPEATING-RADIAL-GRADIENT(#121,#121 5PX,#FFE500 5PX,#FFE500 0)',
      'BACKGROUND:REPEATING-RADIAL-GRADIENT(#121,#121 5PX,#FFE500 0,#FFE500 0)'
    )
  );

  test(
    'radial: should correctly account for "at"',
    passthroughCSS(
      'background:radial-gradient(at 50% 0%,rgba(74,74,74,.15),transparent 40%);'
    )
  );

  test(
    'radial: should correctly account for uppercase "at"',
    passthroughCSS(
      'background:radial-gradient(AT 50% 0%,rgba(74,74,74,.15),transparent 40%);'
    )
  );

  test(
    'radial: should correctly account for "at" (2)',
    processCSS(
      'background:radial-gradient(at 50% 0%,rgba(74,74,74,.15),transparent 40%, red 40%);',
      'background:radial-gradient(at 50% 0%,rgba(74,74,74,.15),transparent 40%, red 0);'
    )
  );

  test(
    'radial: should correctly account for "at" (2) (uppercase)',
    processCSS(
      'background:radial-gradient(AT 50% 0%,RGBA(74,74,74,.15),TRANSPARENT 40%, RED 40%);',
      'background:radial-gradient(AT 50% 0%,RGBA(74,74,74,.15),TRANSPARENT 40%, RED 0);'
    )
  );

  test(
    'radial: should correctly account with prefix "-webkit" (1)',
    processCSS(
      'background: -webkit-radial-gradient(50% 26%, circle, #fff, rgba(255, 255, 255, 0) 24%)',
      'background: -webkit-radial-gradient(50% 26%, circle, #fff, rgba(255, 255, 255, 0) 24%)'
    )
  );

  test(
    'radial: should correctly account with prefix "-webkit" (1) (uppercase)',
    processCSS(
      'background: -WEBKIT-RADIAL-GRADIENT(50% 26%, circle, #fff, rgba(255, 255, 255, 0) 24%)',
      'background: -WEBKIT-RADIAL-GRADIENT(50% 26%, circle, #fff, rgba(255, 255, 255, 0) 24%)'
    )
  );

  test(
    'radial: should correctly account with prefix "-webkit" (1) with px',
    processCSS(
      'background: -webkit-radial-gradient(50% 26px, circle, #fff, rgba(255, 255, 255, 0) 24%)',
      'background: -webkit-radial-gradient(50% 26px, circle, #fff, rgba(255, 255, 255, 0) 24%)'
    )
  );

  test(
    'radial: should correctly account with prefix "-webkit" (1) with px (uppercase)',
    processCSS(
      'background: -webkit-radial-gradient(50% 26PX, circle, #fff, rgba(255, 255, 255, 0) 24%)',
      'background: -webkit-radial-gradient(50% 26PX, circle, #fff, rgba(255, 255, 255, 0) 24%)'
    )
  );

  test(
    'radial: should correctly account with prefix "-webkit" (2)',
    processCSS(
      'background: -webkit-radial-gradient(center, 30% 30%, white 20%, black 10%)',
      'background: -webkit-radial-gradient(center, 30% 30%, white 20%, black 0)'
    )
  );

  test(
    'radial: should correctly account with prefix "-webkit" (2) (uppercase)',
    processCSS(
      'background: -WEBKIT-RADIAL-GRADIENT(CENTER, 30% 30%, WHITE 20%, BLACK 10%)',
      'background: -WEBKIT-RADIAL-GRADIENT(CENTER, 30% 30%, WHITE 20%, BLACK 0)'
    )
  );

  test(
    'radial: should correctly account with prefix "-webkit" (3)',
    processCSS(
      'background: -webkit-radial-gradient(50% 26%, #fff, rgba(255, 255, 255, 0) 24%)',
      'background: -webkit-radial-gradient(50% 26%, #fff, rgba(255, 255, 255, 0) 24%)'
    )
  );

  test(
    'radial: should correctly account with prefix "-webkit" (4)',
    processCSS(
      'background: -webkit-radial-gradient(white 50%, black 40%)',
      'background: -webkit-radial-gradient(white 50%, black 0)'
    )
  );

  test(
    'radial: should correctly account with prefix "-webkit" (4) (uppercase)',
    processCSS(
      'background: -WEBKIT-RADIAL-GRADIENT(WHITE 50%, BLACK 40%)',
      'background: -WEBKIT-RADIAL-GRADIENT(WHITE 50%, BLACK 0)'
    )
  );

  test(
    'radial: should correctly account with prefix "-webkit" (4) with px (uppercase)',
    processCSS(
      'background: -WEBKIT-RADIAL-GRADIENT(WHITE 50px, BLACK 400PX)',
      'background: -WEBKIT-RADIAL-GRADIENT(WHITE 50px, BLACK 400PX)'
    )
  );

  test(
    'radial: should correctly account with prefix "-webkit" (5)',
    processCSS(
      'background: -webkit-radial-gradient(white calc(30%), black calc(50%))',
      'background: -webkit-radial-gradient(white calc(30%), black calc(50%))'
    )
  );

  test(
    'radial: should correctly account with prefix "-webkit" (5) (calc uppercase)',
    processCSS(
      'background: -webkit-radial-gradient(white CALC(30%), black calc(50%))',
      'background: -webkit-radial-gradient(white CALC(30%), black calc(50%))'
    )
  );
});

describe('Variables, edge cases, and plugin API', () => {
  test(
    'should not throw on empty radial gradients',
    passthroughCSS('background: radial-gradient()')
  );

  test(
    'should pass through custom property references',
    passthroughCSS('background-image:var(--bg),linear-gradient(red,blue)')
  );

  test(
    'should pass through custom property references #2',
    passthroughCSS(
      'background:linear-gradient(to var(--var), transparent, black) 0% 50% no-repeat'
    )
  );

  test(
    'should pass through custom property references #3',
    passthroughCSS(
      'background:linear-gradient(var(--var), transparent, black) 0% 50% no-repeat'
    )
  );

  test(
    'should pass through custom property references #4',
    passthroughCSS(
      'background:linear-gradient(var(--var), black) 0% 50% no-repeat'
    )
  );

  test(
    'should pass through custom property references #5',
    passthroughCSS('background:linear-gradient(var(--var)) 0% 50% no-repeat')
  );

  test(
    'should pass through custom property references #6',
    passthroughCSS(
      'background:linear-gradient(var(--var), rgba(255,0,0,0) 70.71%)'
    )
  );

  test(
    'should pass through custom property references #7',
    passthroughCSS(
      'background:linear-gradient(to env(--var), transparent, black) 0% 50% no-repeat'
    )
  );

  test(
    'should pass through custom property references #8',
    passthroughCSS('background:linear-gradient(var(--var))')
  );

  test(
    'should pass through custom property references #9',
    passthroughCSS(
      'background:linear-gradient(var(--foo), var(--bar), var(--baz))'
    )
  );

  test(
    'should pass through env property references',
    passthroughCSS('background:linear-gradient(env(--var))')
  );

  test(
    'should not throw error on broken syntax',
    passthroughCSS('background:')
  );

  test(
    'should not operate on declarations without gradients',
    passthroughCSS('background:red')
  );

  test(
    'should pass through oklch color stops in gradients',
    passthroughCSS(
      'background:linear-gradient(oklch(0.5 0.2 240),oklch(0.8 0.1 200))'
    )
  );

  test(
    'should pass through oklab color stops in gradients',
    passthroughCSS(
      'background:linear-gradient(oklab(0.5 0.1 -0.2),oklab(0.8 0.05 -0.1))'
    )
  );

  test(
    'should pass through hwb color stops in gradients',
    passthroughCSS('background:linear-gradient(hwb(0 0% 0%),hwb(240 0% 0%))')
  );

  test(
    'should pass through lch color stops in gradients',
    passthroughCSS('background:linear-gradient(lch(50 100 30),lch(80 50 200))')
  );

  test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
});
