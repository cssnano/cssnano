import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Invalid values and syntax edge cases', () => {
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
    'should pass through invalid values #7',
    passthroughCSS('h1{transform:rotate3d(1px, 0, 0, 20deg)}')
  );

  test(
    'should pass through invalid values #8',
    passthroughCSS('h1{transform:rotate3d(1%, 0, 0, 20deg)}')
  );

  test(
    'should pass through invalid values #9',
    passthroughCSS('h1{transform:rotate3d(1, 0px, 0, 20deg)}')
  );

  test(
    'should pass through invalid values #10',
    passthroughCSS('h1{transform:scale(1.5, 1px)}')
  );

  test(
    'should pass through invalid values #11',
    passthroughCSS('h1{transform:scale(1.5px, 1.5px)}')
  );

  test(
    'should pass through invalid values #12',
    passthroughCSS('h1{transform:scale3d(1px, 1, 1.5)}')
  );

  test(
    'should pass through invalid values #13',
    passthroughCSS('h1{transform:translate(0deg, 5px)}')
  );

  test(
    'should pass through invalid values #14',
    passthroughCSS('h1{transform:translate3d(0deg, 0, 5px)}')
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

  test('should pass through unbalanced values on declaration', async () => {
    for (const value of ['scale(1, 1', '[scale(1, 1)', 'scale(1, 1]']) {
      const root = postcss.root();
      const rule = postcss.rule({ selector: 'h1' });
      const decl = postcss.decl({ prop: 'transform', value });
      rule.append(decl);
      root.append(rule);
      await postcss([plugin()]).process(root, { from: undefined });
      assert.strictEqual(decl.value, value);
    }
  });

  test(
    'should work with transform:rotate3d(0)',
    processCSS('h1{transform:rotate3d(0)}', 'h1{transform:rotate3d(0)}')
  );

  test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
});

describe('Handles nested syntax and source spelling', () => {
  test(
    'reduces nested known functions before their parent is inspected',
    processCSS('h1{transform:foo(scale(1, 1))}', 'h1{transform:foo(scale(1))}')
  );

  test(
    'reduces multiple transform functions in one value',
    processCSS(
      'h1{transform:scale(1, 1) rotateZ(20deg) translate(4, 0)}',
      'h1{transform:scale(1) rotateZ(20deg) translate(4)}'
    )
  );

  test(
    'does not split arguments inside nested parentheses',
    processCSS(
      'h1{transform:scale(calc(1 + 1), 1)}',
      'h1{transform:scaleX(calc(1 + 1))}'
    )
  );

  test(
    'keeps square and curly blocks intact when selecting an argument',
    processCSS(
      'h1{transform:scale([1, 2], 1) scale({x:1}, 1)}',
      'h1{transform:scaleX([1, 2]) scaleX({x:1})}'
    )
  );

  test(
    'preserves comments on passthrough paths',
    processCSS(
      'h1{transform:scale(1/*keep*/, 1)}',
      'h1{transform:scaleX(1/*keep*/)}'
    )
  );

  test(
    'preserves escaped 3D function names',
    passthroughCSS('h1{transform:ROT\\41 TEZ(20deg)}')
  );

  test(
    'preserves quoted strings and bare URLs',
    passthroughCSS('h1{transform:translate("1", url(image.png))}')
  );

  test(
    'applies reductions to transform-suffixed custom properties',
    processCSS('h1{--transform:scale(1, 1)}', 'h1{--transform:scale(1)}')
  );
});
