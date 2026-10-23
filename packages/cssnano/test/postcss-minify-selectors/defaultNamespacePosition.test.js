import { suite, test } from 'node:test';
import {
  processCSSFactory,
  oneStagePlugin,
} from '../../../../util/testHelpers.js';
import minifySelectors from '../../src/plugins/postcss-minify-selectors/index.js';

const plugin = oneStagePlugin(minifySelectors);

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

// CSS Namespaces 3 and CSS Syntax 3 make an @namespace rule valid only before
// the first style rule. A browser ignores one that comes after, so it must not
// keep a universal selector from being dropped.
suite('a default @namespace and the position of the rules', () => {
  test(
    'a default @namespace after a style rule does not keep the universal selector before it',
    processCSS(
      '*.a{color:red}@namespace url(x);',
      '.a{color:red}@namespace url(x);'
    )
  );

  test(
    'a leading default @namespace keeps the universal selector, which it makes significant',
    passthroughCSS('@namespace url(x);*.a{color:red}')
  );

  test(
    'a default @namespace after a style rule keeps the universal selector after it',
    processCSS(
      '*.a{color:red}@namespace url(x);*.b{color:red}',
      '.a{color:red}@namespace url(x);*.b{color:red}'
    )
  );
});
