import { test, suite } from 'node:test';
import {
  processCSSFactory,
  oneStagePlugin,
} from '../../../../util/testHelpers.js';
import minifySelectors from '../../src/plugins/postcss-minify-selectors/index.js';

const plugin = oneStagePlugin(minifySelectors);

const modernTargets = 'last 2 Chrome versions';

const { processCSS } = processCSSFactory([
  plugin({ sort: false, browserslist: modernTargets }),
]);

suite('fold with sort off keeps list order', () => {
  test(
    'sort off: the fold lists middles in source order, not spelled order',
    processCSS(
      'a+ .y b,a+ .w b,a+ .x b{color:red}',
      'a+:is(.y,.w,.x) b{color:red}'
    )
  );

  test(
    'sort off: a lone selector left after a fold keeps its position in the list',
    processCSS(
      'a+ .y b,a+ .w b,a+ .x b,a+ .w c{color:red}',
      'a+:is(.y,.w,.x) b,a+.w c{color:red}'
    )
  );

  test(
    'sort off: a repeated selector is removed and the rest still fold',
    processCSS('a+ .y b,a+ .w b,a+ .y b{color:red}', 'a+.y b,a+.w b{color:red}')
  );
});
