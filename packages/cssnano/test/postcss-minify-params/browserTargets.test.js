import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../../util/testHelpers.js';
import plugin from '../../src/plugins/postcss-minify-params/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

const input = '@media all{a{color:red}}';

describe('minify-params browser targets', () => {
  // ie 10 and ie 11 misparse a media query without `all`, so the keyword stays.
  for (const query of ['ie 10', 'ie 11']) {
    test(
      `keeps the all keyword for ${query}, which has the ie 10/11 bug`,
      passthroughCSS(input, { overrideBrowserslist: query })
    );
  }

  for (const query of [
    'ie 8',
    'edge 15',
    'defaults',
    'last 1 chrome version',
    'safari TP',
    'op_mini all',
  ]) {
    test(
      `drops the all keyword for ${query}`,
      processCSS(input, '@media{a{color:red}}', { overrideBrowserslist: query })
    );
  }

  test(
    'drops the all keyword when stats select only chrome 150',
    processCSS(input, '@media{a{color:red}}', {
      overrideBrowserslist: '> 1%',
      stats: { chrome: { 150: 100 } },
    })
  );
});
