import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { walkStylesheet } = await import('../../../src/pipeline/traversal.js');
const { TextTable } = await import('../../../src/values/textTable.js');
const { mergePass } = await import('../../../src/passes/merge/index.js');
const { buildRecords, takePlaceOf } =
  await import('../../../src/passes/merge/lib/rules/treeEdits.js');
const { writeBack } =
  await import('../../../src/passes/merge/lib/rules/writeBack.js');
const { createRunContext } =
  await import('../../../src/passes/ir/runContext.js');
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

suite(
  'the merge pass tokenizes a non-simple selector once across its compatibility checks',
  () => {
    test('a rule whose selector has a pseudo-class is tokenized once when rules merge', async () => {
      const { transformPlugin } =
        await import('../../../src/passes/merge/index.js');
      const { default: postcssProcessor } = await import('postcss');
      const root = postcssProcessor.parse('a:hover {color:red} b {color:red}');
      const before = tokenizeTotal();
      await postcssProcessor([transformPlugin('mergeRules')()]).process(root, {
        from: undefined,
      });
      assert.equal(tokenizeTotal() - before, 1);
      assert.equal(root.toString(), 'a:hover,b {color:red}');
    });
  }
);

suite('the merge pass writes selectors through its records', () => {
  test('a rule with a pseudo-class is tokenized once and a simple selector never, when rules merge', async () => {
    const { transformPlugin } =
      await import('../../../src/passes/merge/index.js');
    const { default: postcssProcessor } = await import('postcss');
    const run = async (css) => {
      const before = tokenizeTotal();
      await postcssProcessor([transformPlugin('mergeRules')()]).process(
        postcssProcessor.parse(css),
        { from: undefined }
      );
      return tokenizeTotal() - before;
    };
    assert.equal(await run('a:hover {color:red} b {color:red}'), 1);
    assert.equal(await run('a {color:red} b {color:red}'), 0);
  });

  test('a merged rule whose selector changed without a stored list spells its new selector in the table', () => {
    const root = postcss.parse('a {color:red} b {color:red}');
    const table = new TextTable();
    mergePass(root, resolveTargets({}, undefined), {}, undefined, table);
    assert.equal(tokensText(table.tokens(ruleWith(root, 'a,b'))), 'a,b');
  });

  test('a rule the compatibility check tokenized before its first merge gives the merged rule a stored list', () => {
    const root = postcss.parse('a:hover {color:red} b:focus {color:red}');
    const table = new TextTable();
    mergePass(root, resolveTargets({}, undefined), {}, undefined, table);
    const joined = ruleWith(root, 'a:hover,b:focus');
    const before = tokenizeTotal();
    assert.equal(tokensText(table.tokens(joined)), 'a:hover,b:focus');
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("a marked record whose selector equals its node's comment-free text prints without the comment", () => {
    const root = postcss.parse('a /*x*/, c {color:red}');
    const records = buildRecords(root, createRunContext());
    const rule = records.rule(records.links.firstChild(records.root.index));
    rule.mark();
    writeBack(records, new TextTable());
    assert.equal(root.toString(), 'a , c {color:red}');
  });
});

/**
 * The records of `css`, built the way the driver builds them, with the rule
 * records of its first level in order.
 *
 * @param {string} css
 */
function whitespaceRecordsOf(css) {
  const root = postcss.parse(css);
  const records = buildRecords(root, createRunContext(new TextTable()));
  return { root, records };
}

test('write-back gives a rule the whitespace its record holds, in a container it does not rebuild', () => {
  const { root, records } = whitespaceRecordsOf('a{color:red}\nb{color:blue}');
  const second = root.last;
  records.rule(
    records.links.nextSibling(records.links.firstChild(records.root.index))
  ).before = '\n\n';
  writeBack(records);
  assert.equal(second.raws.before, '\n\n');
});

test('write-back gives a rule nested in an at-rule the whitespace its record holds', () => {
  const { root, records } = whitespaceRecordsOf(
    '@media x{a{color:red}\nb{color:blue}}'
  );
  const media = records.blockEntry(
    records.links.firstChild(records.root.index)
  );
  const nested = records.rule(
    records.links.nextSibling(records.links.firstChild(media.index))
  );
  nested.before = '\n\n';
  writeBack(records);
  assert.equal(root.first.last.raws.before, '\n\n');
});

test('takePlaceOf gives the earlier record the whitespace of the later one, which write-back writes', () => {
  const { root, records } = whitespaceRecordsOf('a{}\n\nb{}\n');
  const earlier = records.rule(records.links.firstChild(records.root.index));
  const later = records.rule(
    records.links.nextSibling(records.links.firstChild(records.root.index))
  );
  takePlaceOf({ records }, root, earlier, later);
  assert.equal(earlier.before, '\n\n');
  writeBack(records);
  assert.equal(root.first.raws.before, '\n\n');
});
