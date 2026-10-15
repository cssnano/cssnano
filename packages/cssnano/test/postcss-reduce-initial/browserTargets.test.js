import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../../util/testHelpers.js';
import plugin from '../../src/plugins/postcss-reduce-initial/index.js';

const { processCSS } = processCSSFactory(plugin);

const input = 'a{background-color:transparent;top:initial}';

describe('reduce-initial browser targets', () => {
  // The initial keyword needs css-initial-value, so transparent stays for these targets.
  for (const query of ['ie 8', 'ie 11', 'defaults', 'op_mini all']) {
    test(
      `keeps transparent for ${query}, which lacks css-initial-value`,
      processCSS(input, 'a{background-color:transparent;top:auto}', {
        overrideBrowserslist: query,
      })
    );
  }

  for (const query of ['edge 15', 'last 1 chrome version', 'safari TP']) {
    test(
      `writes the initial keyword for ${query}`,
      processCSS(input, 'a{background-color:initial;top:auto}', {
        overrideBrowserslist: query,
      })
    );
  }

  test(
    'writes the initial keyword when stats select only chrome 150',
    processCSS(input, 'a{background-color:initial;top:auto}', {
      overrideBrowserslist: '> 1%',
      stats: { chrome: { 150: 100 } },
    })
  );
});
