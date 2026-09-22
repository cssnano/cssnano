import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should preserve space in custom property',
  passthroughCSS('h1{--prop:  }')
);

test(
  'should not add space around empty custom property',
  passthroughCSS('h1{--prop:}')
);

test(
  'should trim whitespace between custom property name and value',
  processCSS(':root{--foo: bar}', ':root{--foo:bar}')
);

test(
  'should not alter custom property values containing var() while trimming colon space',
  processCSS('h1{--custom: var(  --other  )}', 'h1{--custom:var(  --other  )}')
);
