import { test } from 'node:test';
import {
  oneStagePlugin,
  processCSSFactory,
} from '../../../../util/testHelpers.js';
import calc from '../../src/plugins/postcss-calc/index.js';

const plugin = oneStagePlugin(calc);

test(
  'unwrapSingleValue serializes a resolved value without calc()',
  processCSSFactory([plugin({ unwrapSingleValue: true })]).processCSS(
    'a{width:calc(1px + 2px)}',
    'a{width:3px}'
  )
);

test(
  'a value with the mediaQueries option off keeps its media query',
  processCSSFactory([plugin({})]).passthroughCSS(
    '@media (min-width:calc(100px + 20px)){a{color:red}}'
  )
);

test(
  "calc's mediaQueries option leaves an `@supports` condition unchanged, since a reduced `abs()` would pass the feature test where `abs()` fails",
  processCSSFactory([plugin({ mediaQueries: true })]).passthroughCSS(
    '@supports (width:abs(-1px)){a{color:red}}'
  )
);

test(
  "calc's mediaQueries option leaves an `@import` `supports()` condition unchanged, since a reduced `abs()` would pass the feature test where `abs()` fails",
  processCSSFactory([plugin({ mediaQueries: true })]).passthroughCSS(
    '@import url(a.css) supports(width:abs(-1px));'
  )
);

test(
  'calc leaves a container `style()` query unchanged, since it matches the custom property as written',
  processCSSFactory([plugin({ mediaQueries: true })]).passthroughCSS(
    '@container style(--x:calc(1px + 1px)){a{color:red}}'
  )
);

test(
  'mediaQueries reduces a calc() in a container query outside its style() query',
  processCSSFactory([plugin({ mediaQueries: true })]).processCSS(
    '@container (min-width:calc(1px + 1px)) and style(--x:calc(1px + 1px)){a{color:red}}',
    '@container (min-width:calc(2px)) and style(--x:calc(1px + 1px)){a{color:red}}'
  )
);

test(
  'mediaQueries reduces a calc() in the media query parameters',
  processCSSFactory([plugin({ mediaQueries: true })]).processCSS(
    '@media (min-width:calc(100px + 20px)){a{color:red}}',
    '@media (min-width:calc(120px)){a{color:red}}'
  )
);

test(
  'a value with the selectors option off keeps its selector',
  processCSSFactory([plugin({})]).passthroughCSS(
    'a:nth-child(calc(1 + 2)){color:red}'
  )
);

test(
  'selectors reduces a calc() in a selector',
  processCSSFactory([plugin({ selectors: true })]).processCSS(
    'a:nth-child(calc(1 + 2)){color:red}',
    'a:nth-child(3){color:red}'
  )
);

test(
  'selectors leaves a calc() inside a quoted attribute value as a literal',
  processCSSFactory([plugin({ selectors: true })]).passthroughCSS(
    'a[x="calc(1px + 2px)"]{color:red}'
  )
);
