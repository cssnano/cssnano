import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';

/** @param {string} css */
function merge(css) {
  return postcss([plugin]).process(css, { from: undefined }).css;
}

/**
 * @param {string} selector
 * @param {...[string, string]} declarations
 * @return {import('postcss').Rule}
 */
function buildRule(selector, ...declarations) {
  const rule = postcss.rule({ selector });
  for (const [prop, value] of declarations) {
    rule.append(postcss.decl({ prop, value }));
  }
  return rule;
}

// A rewrite assigns its rules to the slots of the pair it replaces, so a node
// between the pair stays between the replacements. A comment marks each gap.

test('should keep the merged rule after the comment when equal declarations merge selectors', () => {
  assert.equal(
    merge('.a{color:red}/*x*/.b{color:red}'),
    '/*x*/.a,.b{color:red}'
  );
});

test('should keep the merged rule before the comment when equal selectors merge declarations', () => {
  assert.equal(
    merge('.a{color:red}/*x*/.a{margin:0}'),
    '.a{color:red;margin:0}/*x*/'
  );
});

test('should keep the comment between the leftover of the earlier rule and the shared rule in a partial merge', () => {
  assert.equal(
    merge('.a{color:red;margin:0}/*x*/.b{color:red;padding:0}'),
    '.a{margin:0}/*x*/.a,.b{color:red}.b{padding:0}'
  );
});

test('should drop the leftover of the earlier rule when a partial merge claims all of its declarations', () => {
  assert.equal(
    merge('.a{color:red;margin:0}/*x*/.b{color:red;margin:0;padding:0}'),
    '/*x*/.a,.b{color:red;margin:0}.b{padding:0}'
  );
});

test('should drop the leftover of the later rule when a partial merge claims all of its declarations', () => {
  assert.equal(
    merge('.a{color:red;padding:0}/*x*/.b{color:red}'),
    '.a{padding:0}/*x*/.a,.b{color:red}'
  );
});

test('should keep the comment before the shared rule when the leftover of the later rule merges with its next neighbor', () => {
  assert.equal(
    merge('.a{color:red}/*x*/.b{color:red;margin:0}.c{margin:0}'),
    '/*x*/.a,.b{color:red}.b,.c{margin:0}'
  );
});

test('should remove a conditional group rule that a move leaves empty and keep the comment after it', () => {
  assert.equal(
    merge('@media print{.a{margin:0}}/*x*/@media print{.b{top:0}}'),
    '@media print{.a{margin:0}.b{top:0}}/*x*/'
  );
});

test('should keep a conditional group rule that a move leaves with only a comment', () => {
  assert.equal(
    merge('@media print{.a{color:red}}@media print{/*k*/.b{color:red}}'),
    '@media print{.a,.b{color:red}/*k*/}'
  );
});

test('should append rules moved into a conditional group rule in their source order', () => {
  assert.equal(
    merge('@media print{.a{color:red}}@media print{.b{margin:0}.c{top:0}}'),
    '@media print{.a{color:red}.b{margin:0}.c{top:0}}'
  );
});

test('should append a moved rule after the rules that already follow the target rule', () => {
  assert.equal(
    merge(
      '@media print{.a{color:red}.z{top:0}}@media print{.b{color:red}.c{margin:0}}'
    ),
    '@media print{.a,.b{color:red}.z{top:0}.c{margin:0}}'
  );
});

// CSS Nesting keeps a declaration that follows nested rules in source order,
// so neither rule of a pair may move across it.

test('should merge nested rules when the declaration of the enclosing rule precedes both', () => {
  assert.equal(
    merge('.r{color:red;.a{margin:0}.b{margin:0}}'),
    '.r{color:red;.a,.b{margin:0}}'
  );
});

test('should not merge nested rules that a declaration of the enclosing rule separates', () => {
  // Merging would move `.b` ahead of `color:red`, which changes the cascade.
  assert.equal(
    merge('.r{.a{margin:0}color:red;.b{margin:0}}'),
    '.r{.a{margin:0}color:red;.b{margin:0}}'
  );
});

test('should not move a nested rule across a declaration that sits in a nested conditional group rule', () => {
  assert.equal(
    merge(
      '.r{@media print{.a{margin:0}}@media screen{color:red}@media print{.b{margin:0}}}'
    ),
    '.r{@media print{.a{margin:0}}@media screen{color:red}@media print{.b{margin:0}}}'
  );
});

test('should not merge a rule moved into an earlier block with the next rule when a declaration separates them', () => {
  // `.b` joins `.a`'s block, which ends before the block that still holds
  // `color:red` and `.c`.
  assert.equal(
    merge(
      '.r{@media print{.a{top:0}}@media print{.b{top:1}color:red;.c{top:2}}}'
    ),
    '.r{@media print{.a{top:0}.b{top:1}}@media print{color:red;.c{top:2}}}'
  );
});

test('should keep merging nested rules across blocks when no declaration separates them', () => {
  assert.equal(
    merge('.r{@media print{.a{top:0}}@media print{.b{top:1}.c{top:2}}}'),
    '.r{@media print{.a{top:0}.b{top:1}.c{top:2}}}'
  );
});

// Whitespace belongs to the rules. Removing the first child of a root hands
// its leading whitespace to the next child, as PostCSS does.

test('should give the leading whitespace of the removed first rule to the rule that takes its place', () => {
  assert.equal(
    merge('\n.a{color:red}\n\n.b{color:red}\n\n.c{margin:0}\n'),
    '\n.a,.b{color:red}\n\n.c{margin:0}\n'
  );
});

test('should keep the leading whitespace of a first rule that a partial merge replaces', () => {
  assert.equal(
    merge('\n.a{color:red;margin:0}\n\n.b{color:red}\n\n.c{top:0}\n'),
    '\n.a{margin:0}\n\n.a,.b{color:red}\n\n.c{top:0}\n'
  );
});

test('should keep the whitespace of the later rule after a leading comment when equal declarations merge selectors', () => {
  assert.equal(
    merge('/*h*/\n.a{color:red}\n\n.b{color:red}\n'),
    '/*h*/\n\n.a,.b{color:red}\n'
  );
});

test('should keep indentation inside a conditional group rule when its rules merge', () => {
  assert.equal(
    merge(
      '@media print{\n  .a{color:red}\n}\n\n@media print{\n  .b{color:red}\n}\n\n.c{top:0}\n'
    ),
    '@media print{\n  .a,.b{color:red}\n}\n\n.c{top:0}\n'
  );
});

test('should print a partial merge of rules built without raws with the default style', () => {
  const root = postcss.root();
  root.append(
    buildRule('.a', ['color', 'red'], ['margin', '0']),
    buildRule('.b', ['color', 'red'], ['padding', '0'])
  );
  postcss([plugin]).process(root, { from: undefined }).sync();
  assert.equal(
    root.toString(),
    '.a {\n    margin: 0\n}\n.a,.b {\n    color: red\n}\n.b {\n    padding: 0\n}'
  );
});

test('should print a rule built without raws that moves into an earlier block with the default style', () => {
  const root = postcss.root();
  const first = postcss.atRule({ name: 'media', params: 'print' });
  first.append(buildRule('.a', ['color', 'red']));
  const second = postcss.atRule({ name: 'media', params: 'print' });
  second.append(buildRule('.b', ['color', 'red'], ['margin', '0']));
  root.append(first, second);
  postcss([plugin]).process(root, { from: undefined }).sync();
  assert.equal(
    root.toString(),
    '@media print {\n    .a,.b {\n        color: red\n    }\n    .b {\n        margin: 0\n    }\n}'
  );
});

// Later plugins and joins read `node.parent`, so the write must leave it
// consistent with the children lists.

/**
 * @param {import('postcss').Container} container
 * @return {string[]} a description of every child whose parent is not `container`
 */
function misparented(container) {
  return container.nodes.flatMap((node) => [
    ...(node.parent === container ? [] : [`${node.type} in ${container.type}`]),
    ...('nodes' in node && node.nodes ? misparented(node) : []),
  ]);
}

test('should leave every node pointing at the container that holds it after rules move into an earlier block', () => {
  const root = postcss.parse(
    '@media print{.a{margin:0}}@media print{.b{top:0}}@media print{.c{top:1}.d{top:2}}'
  );
  postcss([plugin]).process(root, { from: undefined }).sync();
  assert.deepEqual(misparented(root), []);
});

test('should leave every node pointing at the container that holds it after a partial merge in a nested block', () => {
  const root = postcss.parse(
    '.r{@media print{.a{color:red;margin:0}.b{color:red;padding:0}}@media print{.c{top:0}}}'
  );
  postcss([plugin]).process(root, { from: undefined }).sync();
  assert.deepEqual(misparented(root), []);
});
