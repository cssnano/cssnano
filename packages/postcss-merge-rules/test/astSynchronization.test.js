import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';

/**
 * Runs the plugin on `root` in place so tests can observe the original nodes.
 *
 * @param {import('postcss').Root} root
 * @return {Promise<import('postcss').Root>}
 */
async function mergeRules(root) {
  await postcss([plugin()]).process(root, { from: undefined });
  return root;
}

test('should not perform a trailing walkRules traversal to flush rule selectors', async () => {
  const root = postcss.parse('h1{display:block}h2{display:block}');
  let walkRulesCalled = false;
  const originalWalkRules = root.walkRules.bind(root);
  root.walkRules = function (...args) {
    walkRulesCalled = true;
    return originalWalkRules(...args);
  };
  await mergeRules(root);
  assert.strictEqual(walkRulesCalled, false);
  assert.strictEqual(root.toString(), 'h1,h2{display:block}');
});

test('should leave the merged selector list on the surviving rule of the AST after merging equal declarations', async () => {
  const root = postcss.parse('h1{color:red}h2{color:red}');
  const survivor = root.last;
  await mergeRules(root);
  assert.strictEqual(root.nodes.length, 1);
  assert.strictEqual(root.first, survivor);
  assert.strictEqual(survivor.selector, 'h1,h2');
});

test('should preserve selector synchronization across chained sequential merges', async () => {
  const input = '.a{color:red}.b{color:red}.c{color:red}.d{color:red}';
  const expected = '.a,.b,.c,.d{color:red}';
  const root = await mergeRules(postcss.parse(input));
  assert.strictEqual(root.toString(), expected);
  assert.strictEqual(root.first.selector, '.a,.b,.c,.d');
  assert.deepStrictEqual(root.first.selectors, ['.a', '.b', '.c', '.d']);
});

test('should maintain correct selector state across interleaved merge passes', async () => {
  const input =
    '.a{color:red}.b{color:red}.a,.b{font-weight:700}.a,.b{margin:0;padding:0}.c{padding:0}';
  const root = await mergeRules(postcss.parse(input));
  assert.strictEqual(
    root.toString(),
    '.a,.b{color:red;font-weight:700;margin:0}.a,.b,.c{padding:0}'
  );
});

test('should correctly merge rules in nested containers without trailing container traversals', async () => {
  const input =
    '@media (min-width: 768px){.a{color:red}.b{color:red}}' +
    '@supports (display: grid){@layer utils{.x{margin:0}.y{margin:0}}}';
  const expected =
    '@media (min-width: 768px){.a,.b{color:red}}' +
    '@supports (display: grid){@layer utils{.x,.y{margin:0}}}';
  const root = await mergeRules(postcss.parse(input));
  assert.strictEqual(root.toString(), expected);
});

test('should preserve complex selector microsyntaxes with commas and escapes', async () => {
  const input =
    'a[href="https://example.com,test"]{color:blue}b[href="https://example.com,test"]{color:blue}' +
    '.\\:hover{display:inline}.\\#id{display:inline}';
  const expected =
    'a[href="https://example.com,test"],b[href="https://example.com,test"]{color:blue}' +
    '.\\:hover,.\\#id{display:inline}';
  const root = await mergeRules(postcss.parse(input));
  assert.strictEqual(root.toString(), expected);
});

test('should leave unmergeable rules untouched without performing selector modifications or trailing walks', async () => {
  const input = 'h1{color:red}h2{color:blue}';
  const root = postcss.parse(input);
  let walkRulesCalled = false;
  const originalWalkRules = root.walkRules.bind(root);
  root.walkRules = function (...args) {
    walkRulesCalled = true;
    return originalWalkRules(...args);
  };
  await mergeRules(root);
  assert.strictEqual(walkRulesCalled, false);
  assert.strictEqual(root.toString(), input);
  assert.strictEqual(root.first.selector, 'h1');
  assert.strictEqual(root.last.selector, 'h2');
});

test('should correctly synchronize selectors when a declaration merge is followed by a partial merge', async () => {
  const input =
    '.a{background-color:rgba(255,255,255,0.8);font-family:Helvetica,Arial,sans-serif;top:0}' +
    '.b{background-color:rgba(255,255,255,0.8);font-family:Helvetica,Arial,sans-serif;top:0}' +
    '.c{background-color:rgba(255,255,255,0.8);font-family:Helvetica,Arial,sans-serif;bottom:0}';
  const expected =
    '.a,.b{top:0}' +
    '.a,.b,.c{background-color:rgba(255,255,255,0.8);font-family:Helvetica,Arial,sans-serif}' +
    '.c{bottom:0}';
  const root = await mergeRules(postcss.parse(input));
  assert.strictEqual(root.toString(), expected);
  assert.strictEqual(root.nodes[0].selector, '.a,.b');
  assert.deepStrictEqual(root.nodes[0].selectors, ['.a', '.b']);
  assert.strictEqual(root.nodes[1].selector, '.a,.b,.c');
  assert.deepStrictEqual(root.nodes[1].selectors, ['.a', '.b', '.c']);
  assert.strictEqual(root.nodes[2].selector, '.c');
  assert.deepStrictEqual(root.nodes[2].selectors, ['.c']);
});
