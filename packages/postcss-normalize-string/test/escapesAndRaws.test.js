import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

test('should preserve EOF-terminated strings byte-for-byte', async () => {
  const values = ["'abc", "'abc\\'", "'abc\\", "'abc\\27"];
  for (const value of values) {
    const decl = postcss.decl({ prop: 'content', value });
    const root = postcss.root({ nodes: [decl] });
    await postcss([plugin()]).process(root, { from: undefined });
    assert.equal(decl.value, value);
  }
});

test('should preserve EOF-terminated strings in selectors and at-rule params', async () => {
  const rule = postcss.rule({ selector: String.raw`[data-value='abc` });
  const atRule = postcss.atRule({ name: 'media', params: String.raw`'abc` });
  const root = postcss.root({ nodes: [rule, atRule] });
  await postcss([plugin()]).process(root, { from: undefined });
  assert.equal(rule.selector, String.raw`[data-value='abc`);
  assert.equal(atRule.params, String.raw`'abc`);
});

test('should preserve newline-terminated strings in all CSS contexts', async () => {
  const selector = String.raw`[data-value='abc` + '\n' + ']';
  const rule = postcss.rule({ selector });
  const atRule = postcss.atRule({ name: 'supports', params: selector });
  const decl = postcss.decl({ prop: 'content', value: selector });
  const root = postcss.root({ nodes: [rule, atRule, decl] });
  await postcss([plugin()]).process(root, { from: undefined });
  assert.equal(rule.selector, selector);
  assert.equal(atRule.params, selector);
  assert.equal(decl.value, selector);
});

test('should distinguish one and two trailing backslashes before a quote', async () => {
  const eofTerminated = String.raw`'one\'`;
  const closed = String.raw`'two\\'`;
  const root = postcss.root({
    nodes: [
      postcss.decl({ prop: 'content', value: eofTerminated }),
      postcss.decl({ prop: 'content', value: closed }),
    ],
  });
  await postcss([plugin()]).process(root, { from: undefined });
  assert.equal(root.first.value, eofTerminated);
  assert.equal(root.last.value, String.raw`"two\\"`);
});

test('should normalize escaped newlines and hexadecimal quote escapes', async () => {
  const value = String.raw`'line\
  quote \27 '`;
  const decl = postcss.decl({ prop: 'content', value });
  const root = postcss.root({ nodes: [decl] });
  await postcss([plugin()]).process(root, { from: undefined });
  assert.equal(decl.value, '"line  quote \\27 "');
});

test(
  'should normalize multiple strings across CSS contexts',
  processCSS(
    `[a='one\\ two'][b='three']{content:'four' "five";background:url('six') var(--x, 'seven') /*eight*/ 'nine'} @media 'ten' "eleven"{a{content:'twelve'}}`,
    `[a="one\\ two"][b="three"]{content:"four" "five";background:url("six") var(--x, "seven") /*eight*/ "nine"} @media "ten" "eleven"{a{content:"twelve"}}`
  )
);

test('should normalize parsed declaration raw values', async () => {
  const decl = postcss.decl({ prop: 'content', value: "'value'" });
  decl.raws.value = { raw: "'value'", value: "'value'" };
  const root = postcss.root({ nodes: [decl] });
  await postcss([plugin()]).process(root, { from: undefined });
  assert.equal(decl.value, '"value"');
  assert.deepEqual(decl.raws.value, { raw: '"value"', value: '"value"' });
});

test('should ignore stale declaration raw values', async () => {
  const decl = postcss.decl({ prop: 'content', value: "'original'" });
  decl.raws.value = { raw: "'stale'", value: "'original'" };
  const preceding = {
    postcssPlugin: 'change-value',
    Once() {
      decl.value = "'changed'";
    },
  };
  const root = postcss.root({ nodes: [decl] });
  await postcss([preceding, plugin()]).process(root, { from: undefined });
  assert.equal(decl.value, '"changed"');
  assert.deepEqual(decl.raws.value, { raw: '"changed"', value: '"changed"' });
});

test('should normalize declaration raw values with surrounding formatting', async () => {
  const decl = postcss.decl({ prop: 'content', value: "'value'" });
  decl.raws.value = { raw: "  'value'  ", value: "'value'" };
  const root = postcss.root({ nodes: [decl] });
  await postcss([plugin()]).process(root, { from: undefined });
  assert.equal(decl.value, '  "value"  ');
  assert.deepEqual(decl.raws.value, {
    raw: '  "value"  ',
    value: '  "value"  ',
  });
});
