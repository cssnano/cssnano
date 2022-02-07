'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const postcss = require('postcss');
const stylehacks = require('../');
const packageJson = require('../package.json');

function processCss(fixture, expected, options) {
  return () =>
    postcss(stylehacks(options))
      .process(fixture, { from: undefined })
      .then(({ css }) => assert.is(css, expected));
}

function passthroughCss(fixture, options) {
  return processCss(fixture, fixture, options);
}

test('can be used as a postcss plugin', () => {
  let css = 'h1 { _color: #ffffff }';

  return postcss()
    .use(stylehacks())
    .process(css, { from: undefined })
    .then((result) => {
      assert.is(result.css, 'h1 { }');
    });
});

test('can be used as a postcss plugin (2)', () => {
  let css = 'h1 { _color: #ffffff }';

  return postcss([stylehacks()])
    .process(css, { from: undefined })
    .then((result) => assert.is(result.css, 'h1 { }'));
});

test('can be used as a postcss plugin (3)', () => {
  let css = 'h1 { _color: #ffffff }';

  return postcss([stylehacks])
    .process(css, { from: undefined })
    .then((result) => {
      assert.is(result.css, 'h1 { }');
    });
});

test('should use the postcss plugin api', () => {
  assert.is(stylehacks().postcssPlugin, packageJson.name);
});

test('should have a separate detect method', () => {
  let counter = 0;

  const plugin = () => {
    return {
      postcssPlugin: 'test',
      Declaration(decl) {
        if (stylehacks.detect(decl)) {
          counter++;
        }
      },
    };
  };
  plugin.postcss = true;

  return postcss(plugin)
    .process('h1 { _color: red; =color: black }', { from: undefined })
    .then(() => assert.is(counter, 2));
});

test('should have a separate detect method (2)', () => {
  let counter = 0;

  const plugin = () => {
    return {
      postcssPlugin: 'test',
      Rule(rule) {
        if (stylehacks.detect(rule)) {
          counter++;
        }
      },
    };
  };
  plugin.postcss = true;

  return postcss(plugin)
    .process('h1 { _color: red; =color: black }', { from: undefined })
    .then(() => assert.is(counter, 0));
});

test(
  'should handle rules with empty selectors',
  processCss('{ _color: red }', '{ }')
);

test(
  'should pass through other comments in selectors',
  passthroughCss('h1 /* => */ h2 {}')
);

test(
  'should pass through css mixins',
  passthroughCss(
    `paper-card {
        --paper-card-content: {
            padding-top: 0;
        };
        margin: 0 auto 16px;
        width: 768px;
        max-width: calc(100% - 32px);
    }`
  )
);

test(
  'should pass through css mixins (2)',
  passthroughCss(
    `paper-card {
        --paper-card-header: {
            height: 128px;
            padding: 0 48px;
            background: var(--primary-color);

            @apply(--layout-vertical);
            @apply(--layout-end-justified);
        };
        --paper-card-header-color: #FFF;
        --paper-card-content: {
            padding: 64px;
        };
        --paper-card-actions: {
            @apply(--layout-horizontal);
            @apply(--layout-end-justified);
        };
        width: 384px;
    }`
  )
);
test.run();
