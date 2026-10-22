import { describe, test } from 'node:test';
import {
  oneStagePlugin,
  processCSSFactory,
} from '../../../../util/testHelpers.js';
import colormin from '../../src/plugins/postcss-colormin/index.js';

const plugin = oneStagePlugin(colormin);

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

  // `\9` is the IE 6–9 hack; dropping it would make an IE-only value valid everywhere.
  test(
    'should pass through keyword with \\9 hack: red\\9 untouched',
    passthroughCSS('h1{color:red\\9}')
  );

  test(
    'should pass through hex with \\9 hack: #ffffff\\9 untouched',
    passthroughCSS('h1{color:#ffffff\\9}')
  );

  // The hack suffix after a function is its own token; separating it would
  // change the tokens of a value that only old IE reads.
  test(
    'should pass through color function with \\9 hack: rgb(255,0,0)\\9 untouched',
    passthroughCSS('h1{color:rgb(255,0,0)\\9}')
  );

  // `\0` and `\0/` are the IE 8 hacks; the escape is not whitespace, but it
  // still marks a value that only old IE reads.
  test(
    'should pass through color function with \\0 hack: rgb(255,0,0)\\0 untouched',
    passthroughCSS('h1{color:rgb(255,0,0)\\0}')
  );

  test(
    'should pass through color function with \\0/ hack: rgb(255,0,0)\\0/ untouched',
    passthroughCSS('h1{color:rgb(255,0,0)\\0/}')
  );

  test(
    'should pass through hex with \\0/ hack: #ffffff\\0/ untouched',
    passthroughCSS('h1{color:#ffffff\\0/}')
  );

  // Any escape-led identifier that touches a color may be a hack for a
  // browser we cannot name, so the value stays as written.
  test(
    'should pass through color function followed by an escaped identifier: rgb(255,0,0)\\41 untouched',
    passthroughCSS('h1{color:rgb(255,0,0)\\41}')
  );

  test(
    'should still minify a color function followed by an ordinary keyword',
    processCSS('h1{border:rgb(255,0,0)solid}', 'h1{border:red solid}')
  );
});
