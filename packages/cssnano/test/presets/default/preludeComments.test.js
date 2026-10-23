import { test } from 'node:test';
import preset from '../../../src/presets/default.js';
import { processCSSFactory } from '../../../../../util/testHelpers.js';

const { processCSS } = processCSSFactory(preset());

test(
  'should keep an important comment after an @import url that normalizeUrl rewrites',
  processCSS(
    '@import url("a.css") /*!x*/ screen;',
    '@import "a.css" /*!x*/ screen;'
  )
);

test(
  'should leave one space where a comment after an @import url was removed',
  processCSS('@import url("a.css") /*x*/ screen;', '@import "a.css" screen;')
);

test(
  'should keep an important comment after an @import string that normalizeString rewrites',
  processCSS("@import 'a.css' /*!x*/ screen;", '@import "a.css" /*!x*/ screen;')
);

test(
  'should leave one space where a comment after an @import string was removed',
  processCSS("@import 'a.css' /*x*/ screen;", '@import "a.css" screen;')
);
