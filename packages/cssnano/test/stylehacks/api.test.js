import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { hasHack } from '../../src/utils/stylehacks/index.js';
import { detectsHack, detectsNoHack } from './_detectHack.js';

test('should have a separate hasHack function', async () => {
  let counter = 0;

  const plugin = () => {
    return {
      postcssPlugin: 'test',
      Declaration(decl) {
        if (hasHack(decl.raws.before, decl.prop, decl.value)) {
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

test('hasHack reclassifies a declaration after its value changes', () => {
  const decl = postcss.parse('a{margin:1px}').first.first;

  assert.equal(hasHack(decl.raws.before, decl.prop, decl.value), false);

  decl.value = '1px\\9';

  assert.equal(hasHack(decl.raws.before, decl.prop, decl.value), true);
});

test('hasHack detects a declaration anew once its before gains a hack prefix', () => {
  const decl = postcss.parse('a{color:red}').first.first;

  assert.equal(hasHack(decl.raws.before, decl.prop, decl.value), false);

  decl.raws.before = ' _';

  assert.equal(hasHack(decl.raws.before, decl.prop, decl.value), true);
});

test('hasHack does not share classifications with cloned declarations', () => {
  const decl = postcss.parse('a{margin:1px}').first.first;

  assert.equal(hasHack(decl.raws.before, decl.prop, decl.value), false);

  const clone = decl.clone({ value: '1px\\9' });

  assert.equal(hasHack(clone.raws.before, clone.prop, clone.value), true);
});

test(
  'should detect a hack in a rule with an empty selector',
  detectsHack('{ _color: red }')
);

test(
  'should pass through css mixins',
  detectsNoHack(`paper-card {
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
  detectsNoHack(`paper-card {
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
