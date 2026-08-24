import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import stylehacks from '../src/index.js';
import packageJson from '../package.json' with { type: 'json' };

function processCss(fixture, expected, options) {
  return async () => {
    const { css } = await postcss(stylehacks(options)).process(fixture, {
      from: undefined,
    });
    assert.strictEqual(css, expected);
  };
}

function passthroughCss(fixture, options) {
  return processCss(fixture, fixture, options);
}

test('can be used as a postcss plugin', async () => {
  const css = 'h1 { _color: #ffffff }';

  const result = await postcss()
    .use(stylehacks())
    .process(css, { from: undefined });

  assert.strictEqual(result.css, 'h1 { }');
});

test('can be used as a postcss plugin (2)', async () => {
  const css = 'h1 { _color: #ffffff }';

  const result = await postcss([stylehacks()]).process(css, {
    from: undefined,
  });

  assert.strictEqual(result.css, 'h1 { }');
});

test('can be used as a postcss plugin (3)', async () => {
  const css = 'h1 { _color: #ffffff }';

  const result = await postcss([stylehacks]).process(css, { from: undefined });

  assert.strictEqual(result.css, 'h1 { }');
});

test('should use the postcss plugin api', () => {
  assert.strictEqual(stylehacks().postcssPlugin, packageJson.name);
});

test('should have a separate detect method', async () => {
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

  await postcss(plugin).process('h1 { _color: red; =color: black }', {
    from: undefined,
  });
  assert.strictEqual(counter, 2);
});

test('should have a separate detect method (2)', async () => {
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

  await postcss(plugin).process('h1 { _color: red; =color: black }', {
    from: undefined,
  });
  assert.strictEqual(counter, 0);
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
  passthroughCss(`paper-card {
        --paper-card-content: {
            padding-top: 0;
        };
        margin: 0 auto 16px;
        width: 768px;
        max-width: calc(100% - 32px);
    }`)
);

test(
  'should pass through css mixins (2)',
  passthroughCss(`paper-card {
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
    }`)
);
