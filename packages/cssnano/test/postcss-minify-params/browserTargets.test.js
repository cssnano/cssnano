import { describe, test } from 'node:test';
import {
  processCSSFactory,
  withTargets,
  oneStagePlugin,
} from '../../../../util/testHelpers.js';
import minifyParams from '../../src/plugins/postcss-minify-params/index.js';

const plugin = oneStagePlugin(minifyParams);

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

const input = '@media all{a{color:red}}';

describe('minify-params browser targets', () => {
  // IE 11 misparses a media query without `all`, so the keyword stays.
  test(
    'keeps the all keyword for ie 11, which has the media all bug',
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
      `drops the all keyword for ${query}`,
      processCSS(input, '@media{a{color:red}}', withTargets(query))
    );
  }

  test(
    'drops the all keyword when stats select only chrome 150',
    processCSS(
      input,
      '@media{a{color:red}}',
      withTargets('> 1%', { stats: { chrome: { 150: 100 } } })
    )
  );
});
