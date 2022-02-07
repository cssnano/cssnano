'use strict';
const { test } = require('uvu');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');

const plugin = require('../src/index.js');

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test('should pass through "block ruby"', passthroughCSS('display:block ruby;'));

test('should pass through single values', passthroughCSS('display:block;'));
/* source: https://www.w3.org/TR/css-display-3/#the-display-properties */
[
  { input: 'block flow', minified: 'block' },
  { input: 'block flow-root', minified: 'flow-root' },
  { input: 'inline flow', minified: 'inline' },
  { input: 'inline flow-root', minified: 'inline-block' },
  { input: 'run-in flow', minified: 'run-in' },
  { input: 'list-item block flow', minified: 'list-item' },
  { input: 'inline flow list-item', minified: 'inline list-item' },
  { input: 'block flex', minified: 'flex' },
  { input: 'inline flex', minified: 'inline-flex' },
  { input: 'block grid', minified: 'grid' },
  { input: 'inline grid', minified: 'inline-grid' },
  { input: 'inline ruby', minified: 'ruby' },
  { input: 'block table', minified: 'table' },
  { input: 'inline table', minified: 'inline-table' },
  { input: 'table-cell flow', minified: 'table-cell' },
  { input: 'table-caption flow', minified: 'table-caption' },
  { input: 'ruby-base flow', minified: 'ruby-base' },
  { input: 'ruby-text flow', minified: 'ruby-text' },
].forEach((fixture) => {
  const { input, minified } = fixture;
  test(
    `display: ${input} => display: ${minified}`,
    processCSS(`display:${input}`, `display:${minified}`)
  );
});

test(
  `display: block flow => display: block (uppercase property and values)`,
  processCSS(`DISPLAY:BLOCK FLOW`, `DISPLAY:block`)
);

test(`should pass through variables`, passthroughCSS(`display:var(--foo)`));

test(
  `should pass through variables #1`,
  passthroughCSS(`display:var(--foo) var(--bar)`)
);

test(`should pass through invalid syntax`, passthroughCSS(`display:`));

test(
  `should pass through not display property`,
  passthroughCSS(`something-display: block flow`)
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
test.run();
