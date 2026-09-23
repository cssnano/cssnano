import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS } = processCSSFactory(plugin);

describe('Delimiter tracking and math boundaries', () => {
  test(
    'should preserve nested parentheses in math expressions',
    passthroughCSS('h1{color:calc((100vw - 20px) / 2)}')
  );

  test('should fail closed on unbalanced delimiters in math functions', async () => {
    const root = postcss.root();
    const rule = postcss.rule({ selector: 'h1' });
    const decl = postcss.decl({ prop: 'color', value: 'calc(100vw - 20px' });
    rule.append(decl);
    root.append(rule);

    await postcss([plugin()]).process(root, { from: undefined });
    assert.strictEqual(decl.value, 'calc(100vw - 20px');
  });

  test('should fail closed on unbalanced delimiters in color functions', async () => {
    const root = postcss.root();
    const rule = postcss.rule({ selector: 'h1' });
    const decl = postcss.decl({ prop: 'color', value: 'rgb(255, 0, 0' });
    rule.append(decl);
    root.append(rule);

    await postcss([plugin()]).process(root, { from: undefined });
    assert.strictEqual(decl.value, 'rgb(255, 0, 0');
  });
});
