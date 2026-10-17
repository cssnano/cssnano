import { describe, test } from 'node:test';
import {
  processCSSFactory,
  withTargets,
} from '../../../../util/testHelpers.js';
import plugin from '../../src/plugins/postcss-convert-values/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

const input = 'a{height:0%;min-width:0%}';

describe('convert-values browser targets', () => {
  // IE 11 needs the unit on 0% for height and min-width.
  test(
    'keeps 0% for ie 11, because an IE target needs the unit',
    passthroughCSS(input, withTargets('ie 11'))
  );

  for (const query of [
    'edge 15',
    'defaults',
    'last 1 chrome version',
    'safari TP',
    'op_mini all',
  ]) {
    test(
      `drops the unit from 0% for ${query}, which has no IE target`,
      processCSS(input, 'a{height:0;min-width:0}', withTargets(query))
    );
  }

  test(
    'drops the unit from 0% when stats select only chrome 150',
    processCSS(
      input,
      'a{height:0;min-width:0}',
      withTargets('> 1%', { stats: { chrome: { 150: 100 } } })
    )
  );
});
