import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { walkStylesheet } = await import('../../../src/pipeline/traversal.js');
const { TextTable } = await import('../../../src/values/textTable.js');
const { mergePass } = await import('../../../src/passes/merge/index.js');
const { resolveTargets } = await import('../../../src/utils/browserTargets.js');
const { tokensText } = await import('../../../src/values/tokensText.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

const helpers = { result: { warn() {} } };

/**
 * Parses the stylesheet and gives each selector a token list through the
 * host walk, as the default preset does before the merge pass runs.
 *
 * @param {string} css
 * @return {{root: import('postcss').Root, table: InstanceType<typeof TextTable>}}
 */
function walkedStylesheet(css) {
  const root = postcss.parse(css);
  const table = new TextTable();
  walkStylesheet(
    [{ selector: (buffer) => buffer.tokens() }],
    root,
    helpers,
    new Map(),
    table
  );
  return { root, table };
}

/**
 * @param {import('postcss').Root} root
 * @param {string} selector
 * @return {import('postcss').Rule}
 */
function ruleWith(root, selector) {
  let found;
  root.walkRules((rule) => {
    if (rule.selector === selector) found = rule;
  });
  assert.ok(found, `no rule with selector ${selector}`);
  return found;
}

suite('the merge pass leaves the selectors it writes in the text table', () => {
  test('a rule that merge joins with another reads its selector list without tokenizing', () => {
    const { root, table } = walkedStylesheet('a {color:red} b {color:red}');
    mergePass(root, resolveTargets({}, undefined), {}, undefined, table);
    const joined = ruleWith(root, 'a,b');
    const before = tokenizeTotal();
    assert.equal(tokensText(table.tokens(joined)), 'a,b');
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('a shared rule that merge builds from two selector lists reads its list without tokenizing', () => {
    const { root, table } = walkedStylesheet(
      'a, c {color:red;margin:0} b {color:red;padding:0}'
    );
    mergePass(root, resolveTargets({}, undefined), {}, undefined, table);
    const shared = ruleWith(root, 'a,c,b');
    const before = tokenizeTotal();
    assert.equal(tokensText(table.tokens(shared)), 'a,c,b');
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('a rule that merge clones with its selector list keeps the separator of the source, and reads it without tokenizing', () => {
    const { root, table } = walkedStylesheet(
      'a, c {color:red;margin:0} b {color:red;padding:0}'
    );
    mergePass(root, resolveTargets({}, undefined), {}, undefined, table);
    const leftover = ruleWith(root, 'a, c');
    const before = tokenizeTotal();
    assert.equal(tokensText(table.tokens(leftover)), 'a, c');
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('a rule that a later rule joins by repeating its declarations reads its grown selector list without tokenizing', () => {
    const { root, table } = walkedStylesheet(
      'a {color:red} p {margin:0} b {color:red}'
    );
    mergePass(root, resolveTargets({}, undefined), {}, undefined, table);
    const group = ruleWith(root, 'a,b');
    const before = tokenizeTotal();
    assert.equal(tokensText(table.tokens(group)), 'a,b');
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('elementKeys reads the selector merge.js wrote, without tokenizing', () => {
    const { root, table } = walkedStylesheet(
      'div > a {color:red} div > b {color:red} p {margin:0} div > c {color:red}'
    );
    const before = tokenizeTotal();
    mergePass(root, resolveTargets({}, undefined), {}, undefined, table);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('elementKeys reads the selector declarationJoin.js wrote, without tokenizing', () => {
    const { root, table } = walkedStylesheet(
      'div > a {color:red} p {margin:0} div > b {color:red}'
    );
    const before = tokenizeTotal();
    mergePass(root, resolveTargets({}, undefined), {}, undefined, table);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('elementKeys reads the selector ruleRewrite.js wrote, without tokenizing', () => {
    const { root, table } = walkedStylesheet(
      'div > a, div > c {color:red;margin:0} div > b {color:red;padding:0} div > d {color:red}'
    );
    const before = tokenizeTotal();
    mergePass(root, resolveTargets({}, undefined), {}, undefined, table);
    assert.equal(tokenizeTotal() - before, 0);
  });
});
