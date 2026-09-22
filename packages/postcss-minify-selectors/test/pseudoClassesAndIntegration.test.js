import { test, suite } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import magician from 'postcss-font-magician';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

suite(':nth-child and related pseudo-classes', () => {
  test(
    'should convert :nth-child(1) to :first-child',
    processCSS('p:nth-child(1){color:blue}', 'p:first-child{color:blue}')
  );

  test(
    'should convert :nth-child(1) to :first-child (2)',
    processCSS('p:NTH-CHILD(1){color:blue}', 'p:first-child{color:blue}')
  );

  test(
    'should convert :nth-child(2n + 1) to :nth-child(odd)',
    processCSS(
      'p:nth-child(2n + 1){color:blue}',
      'p:nth-child(odd){color:blue}'
    )
  );

  test(
    'should convert :nth-child(even) to :nth-child(2n)',
    processCSS('p:nth-child(even){color:blue}', 'p:nth-child(2n){color:blue}')
  );

  test(
    'should convert :nth-child(even) to :nth-child(2n) (2)',
    processCSS('p:nth-child(EVEN){color:blue}', 'p:nth-child(2n){color:blue}')
  );

  test(
    'should convert :nth-of-type(1) to :first-of-type',
    processCSS('p:nth-of-type(1){color:blue}', 'p:first-of-type{color:blue}')
  );

  test(
    'should convert :nth-of-type(2n + 1) to :nth-of-type(odd)',
    processCSS(
      'p:nth-of-type(2n + 1){color:blue}',
      'p:nth-of-type(odd){color:blue}'
    )
  );

  test(
    'should convert :nth-of-type(2n + 1) to :nth-of-type(odd) (2)',
    processCSS(
      'p:nth-of-type(2N + 1){color:blue}',
      'p:nth-of-type(odd){color:blue}'
    )
  );

  test(
    'should convert :nth-of-type(even) to :nth-of-type(2n)',
    processCSS(
      'p:nth-of-type(even){color:blue}',
      'p:nth-of-type(2n){color:blue}'
    )
  );

  test(
    'should convert :nth-last-child(1) to :last-child',
    processCSS('p:nth-last-child(1){color:blue}', 'p:last-child{color:blue}')
  );

  test(
    'should convert :nth-last-child(2n + 1) to :nth-last-child(odd)',
    processCSS(
      'p:nth-last-child(2n + 1){color:blue}',
      'p:nth-last-child(odd){color:blue}'
    )
  );

  test(
    'should convert :nth-last-child(even) to :nth-last-child(2n)',
    processCSS(
      'p:nth-last-child(even){color:blue}',
      'p:nth-last-child(2n){color:blue}'
    )
  );

  test(
    'should convert :nth-last-of-type(1) to :last-of-type',
    processCSS(
      'p:nth-last-of-type(1){color:blue}',
      'p:last-of-type{color:blue}'
    )
  );

  test(
    'should convert :nth-last-of-type(2n + 1) to :nth-last-of-type(odd)',
    processCSS(
      'p:nth-last-of-type(2n + 1){color:blue}',
      'p:nth-last-of-type(odd){color:blue}'
    )
  );

  test(
    'should handle :nth-last-of-type(2n + 2)',
    processCSS(
      'p:nth-last-of-type(2n + 2){color:blue}',
      'p:nth-last-of-type(2n+2){color:blue}'
    )
  );

  test(
    'should convert :nth-last-of-type(even) to :nth-last-of-type(2n)',
    processCSS(
      'p:nth-last-of-type(even){color:blue}',
      'p:nth-last-of-type(2n){color:blue}'
    )
  );

  test(
    'should handle first/last of type without parameters',
    passthroughCSS('body>h2:not(:first-of-type):not(:last-of-type){color:blue}')
  );

  test(
    'should convert :nth-child(even of S) to :nth-child(2n of S)',
    processCSS(
      ':nth-child(even of .a){color:blue}',
      ':nth-child(2n of .a){color:blue}'
    )
  );

  test(
    'should convert :nth-last-child(even of S) to :nth-last-child(2n of S)',
    processCSS(
      ':nth-last-child(even of .a){color:blue}',
      ':nth-last-child(2n of .a){color:blue}'
    )
  );

  test(
    'should normalize formula spacing with of S',
    processCSS(
      ':nth-child( 2n + 1 of .a, #b ){color:blue}',
      ':nth-child(2n+1 of .a,#b){color:blue}'
    )
  );
});

/*
 * Reference: https://github.com/tivac/modular-css/issues/228
 */
function encode(str) {
  let result = '';

  for (let i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }

  return result;
}

suite('plugin integration', () => {
  test('cssnano issue 39', () => {
    const css =
      'body{font:100%/1.25 "Open Sans", sans-serif;background:#F6F5F4;overflow-x:hidden}';
    assert.doesNotThrow(
      () =>
        postcss([magician(), plugin()]).process(css, { from: undefined }).css
    );
  });

  test('should handle selectors from other plugins', () => {
    const toModules = () => {
      return {
        postcssPlugin: 'toModules',
        Once(root) {
          root.walkRules((rule) => {
            rule.selectors = rule.selectors.map((selector) => {
              const slice = selector.slice(1);

              return `.${encode(slice).slice(0, 7)}__${slice}`;
            });
          });
        },
      };
    };
    toModules.postcss = true;

    const css = `.test, /* comment #1 - this comment breaks stuff */
.test:hover {  /* comment #2 - ...but this comment is fine */
  position: absolute;
}

.ok {
  padding: 4px;
}`;
    const expected = `.7465737__test,.7465737__test:hover {  /* comment #2 - ...but this comment is fine */
  position: absolute;
}

.6f6b__ok {
  padding: 4px;
}`;
    assert.strictEqual(
      postcss([toModules, plugin]).process(css, { from: undefined }).css,
      expected
    );
  });

  test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
});

suite('namespace and duplicate handling', () => {
  test(
    'should handle attribute selector and namespace',
    passthroughCSS('::slotted([foo|bar])')
  );

  test(
    'should handle attribute selector and namespace #2',
    passthroughCSS('div[*|att] {  }')
  );

  test(
    'should handle attribute selector and namespace #3',
    passthroughCSS('div[|att] {  }')
  );

  test(
    'should handle attribute selector and namespace #3',
    passthroughCSS('div[att] {  }')
  );

  test(
    "should not remove equal selectors parts which aren't duplicates #1402",
    processCSS(':where(a,:not(a)) {  }', ':where(a,:not(a)) {  }')
  );

  test(
    "should not remove equal selectors parts which aren't duplicates #1216",
    processCSS(
      ':where(:nth-child(7),:nth-child(7)~*) {  }',
      ':where(:nth-child(7),:nth-child(7)~*) {  }'
    )
  );

  test(
    'should preserve selector namespaces with has pseudo-attribute',
    passthroughCSS('bar|*:has(*),|*:has(*) {color: currentcolor }')
  );
});
