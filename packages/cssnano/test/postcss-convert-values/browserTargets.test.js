import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../../util/testHelpers.js';
import plugin from '../../src/plugins/postcss-convert-values/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

const input = 'a{height:0%;min-width:0%}';

describe('convert-values browser targets', () => {
  // Any target list that contains an ie browser keeps the unit: IE 11 needs
  // 0% for height and min-width.
  for (const query of ['ie 8', 'ie 9', 'ie 11']) {
    test(
      `keeps 0% for ${query}, because an IE target needs the unit`,
      passthroughCSS(input, { overrideBrowserslist: query })
    );
  }

  for (const query of [
    'edge 15',
    'defaults',
    'last 1 chrome version',
    'safari TP',
    'op_mini all',
  ]) {
    test(
      `drops the unit from 0% for ${query}, which has no IE target`,
      processCSS(input, 'a{height:0;min-width:0}', {
        overrideBrowserslist: query,
      })
    );
  }

  test(
    'drops the unit from 0% when stats select only chrome 150',
    processCSS(input, 'a{height:0;min-width:0}', {
      overrideBrowserslist: '> 1%',
      stats: { chrome: { 150: 100 } },
    })
  );
});
