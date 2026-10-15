import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../../util/testHelpers.js';
import plugin from '../../src/plugins/postcss-minify-selectors/index.js';

const { processCSS } = processCSSFactory(plugin);

const input = '.a .b a, .a .c a, .a .d a {color:red}';
const unfolded = '.a .b a,.a .c a,.a .d a {color:red}';
const folded = '.a :is(.b,.c,.d) a {color:red}';

describe('minify-selectors browser targets', () => {
  // Without :is() support, the selector list stays unfolded.
  for (const query of ['ie 8', 'ie 11', 'edge 15', 'defaults', 'op_mini all']) {
    test(
      `keeps the unfolded selector list for ${query}, which lacks :is()`,
      processCSS(input, unfolded, { overrideBrowserslist: query })
    );
  }

  for (const query of ['last 1 chrome version', 'safari TP']) {
    test(
      `folds the selector list into :is() for ${query}`,
      processCSS(input, folded, { overrideBrowserslist: query })
    );
  }

  test(
    'folds the selector list when stats select only chrome 150',
    processCSS(input, folded, {
      overrideBrowserslist: '> 1%',
      stats: { chrome: { 150: 100 } },
    })
  );
});
