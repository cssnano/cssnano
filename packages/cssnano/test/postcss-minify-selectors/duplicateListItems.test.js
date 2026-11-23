import { test, suite } from 'node:test';
import {
  processCSSFactory,
  oneStagePlugin,
  withTargets,
} from '../../../../util/testHelpers.js';
import minifySelectors from '../../src/plugins/postcss-minify-selectors/index.js';

const plugin = oneStagePlugin(minifySelectors);

const { processCSS } = processCSSFactory(plugin);

const modernBl = withTargets('last 2 Chrome versions');

suite('a list that dedupes to one item', () => {
  test(
    'should minify a multi-line list whose two items are the same selector',
    processCSS('.a,\n.a{color:blue}', '.a{color:blue}')
  );

  test(
    'should minify a list of a compound selector repeated with a space',
    processCSS('.a.b, .a.b{color:blue}', '.a.b{color:blue}')
  );

  test(
    'should minify a multi-line duplicate list inside keyframes',
    processCSS(
      '@keyframes x{.a,\n.a{color:blue}}',
      '@keyframes x{.a{color:blue}}'
    )
  );

  test(
    'should minify a multi-line duplicate list when the :is() fold is enabled',
    processCSS('.a,\n.a{color:blue}', '.a{color:blue}', modernBl)
  );
});

suite('a list with a duplicate among other items', () => {
  test(
    'should drop the repeated item and keep the sorted rest',
    processCSS('.b,.a,.b{color:blue}', '.a,.b{color:blue}')
  );
});
