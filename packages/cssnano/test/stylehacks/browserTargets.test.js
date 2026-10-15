import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../../util/testHelpers.js';
import plugin from '../../src/plugins/stylehacks/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

const input = String.raw`a{color:red\9;*zoom:1;_height:1px;background:red\0/}`;

describe('stylehacks browser targets', () => {
  // ie 6 is in every hack's target list, so no hack is removed.
  test(
    'keeps every hack for ie 6',
    passthroughCSS(input, { overrideBrowserslist: 'ie 6' })
  );

  test(
    'removes the ie 6 and 7 hacks for ie 8',
    processCSS(input, String.raw`a{color:red\9;background:red\0/}`, {
      overrideBrowserslist: 'ie 8',
    })
  );

  for (const query of [
    'ie 9',
    'ie 11',
    'edge 15',
    'defaults',
    'last 1 chrome version',
  ]) {
    test(
      `removes the hacks for ${query}, which does not target the IE 6-8 hacks`,
      processCSS(input, String.raw`a{background:red\0/}`, {
        overrideBrowserslist: query,
      })
    );
  }
});
