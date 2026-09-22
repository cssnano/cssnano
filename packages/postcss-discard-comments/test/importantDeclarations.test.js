import { describe, test } from 'node:test';

import { processCSSFactory } from '../../../util/testHelpers.js';

import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

// A previous plugin rewrote `decl.value` while retaining the original raw
// value metadata, so `raws.value.value` no longer matches `decl.value`.
const staleRawPlugin = {
  postcssPlugin: 'stale-raw',
  Declaration(decl) {
    decl.value = 'new value';
  },
};

describe('Declaration values with !important', () => {
  test(
    'should remove comments from a declaration value that carries !important',
    processCSS('a{color:re/*x*/d!important}', 'a{color:re d!important}')
  );

  test(
    'should remove comments from authoritative raw value metadata of a declaration with !important',
    processCSS('a{color:old /*x*/!important}', 'a{color:old!important}')
  );

  test(
    'should prefer a changed declaration value over stale raw value metadata when !important is present',
    processCSSFactory([staleRawPlugin, plugin]).processCSS(
      'a{color:old /*x*/!important}',
      'a{color:new value!important}'
    )
  );
});
