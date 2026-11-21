import { describe, test } from 'node:test';
import {
  oneStagePlugin,
  processCSSFactory,
  withTargets,
} from '../../../../util/testHelpers.js';
import reduceInitial from '../../src/plugins/postcss-reduce-initial/index.js';

const plugin = oneStagePlugin(reduceInitial);

const { processCSS } = processCSSFactory(plugin);

const input = 'a{background-color:transparent;top:initial}';

describe('reduce-initial browser targets', () => {
  // Without css-initial-value, the target ignores `initial`, so neither
  // keyword is rewritten: transparent and initial stay as written.
  for (const query of ['ie 8', 'ie 11', 'defaults', 'op_mini all']) {
    test(
      `keeps transparent and the initial keyword for ${query}, which lacks css-initial-value`,
      processCSS(input, input, withTargets(query))
    );
  }

  // IE 11 ignores a declaration with the initial keyword, so auto would apply it.
  for (const query of ['ie 11', 'ie 8']) {
    test(
      `keeps the initial keyword for min-width for ${query}, which lacks css-initial-value`,
      processCSS(
        'a{min-width:initial}',
        'a{min-width:initial}',
        withTargets(query)
      )
    );
  }

  for (const query of ['edge 15', 'last 1 chrome version', 'safari TP']) {
    test(
      `writes the initial keyword for ${query}`,
      processCSS(
        input,
        'a{background-color:initial;top:auto}',
        withTargets(query)
      )
    );
  }

  test(
    'writes the initial keyword when stats select only chrome 150',
    processCSS(
      input,
      'a{background-color:initial;top:auto}',
      withTargets('> 1%', { stats: { chrome: { 150: 100 } } })
    )
  );
});
