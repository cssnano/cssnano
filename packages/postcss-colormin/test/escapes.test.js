import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('CSS escape sequences handling', () => {
  test(
    'should minify escaped keyword: \\77 hite -> #fff',
    processCSS('h1{color:\\77 hite}', 'h1{color:#fff}')
  );

  test(
    'should minify escaped function name: \\72 gb(255, 0, 0) -> red',
    processCSS('h1{color:\\72 gb(255, 0, 0)}', 'h1{color:red}')
  );

  test(
    'should minify escaped hex token: #fff\\66 ff -> #fff',
    processCSS('h1{color:#fff\\66 ff}', 'h1{color:#fff}')
  );

  test(
    'should pass through escaped hash ident: \\23 ffffff untouched',
    passthroughCSS('h1{color:\\23 ffffff}')
  );
});
