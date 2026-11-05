import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { walkStylesheet } = await import('../../../src/pipeline/traversal.js');
const { TextTable } = await import('../../../src/values/textTable.js');
const { mergePass, transformPass } =
  await import('../../../src/passes/merge/index.js');
const { buildRecords, removeRules, takePlaceOf } =
  await import('../../../src/passes/merge/lib/rules/treeEdits.js');
const { assertRecordsMatchTree, writeBack } =
  await import('../../../src/passes/merge/lib/rules/writeBack.js');
const { consistencyChecksEnabled, enableConsistencyChecks } =
  await import('../../../src/passes/ir/consistencyChecks.js');
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

test('write-back gives a rule the whitespace its record holds, in the stylesheet it rebuilds', () => {
  const { root, records } = whitespaceRecordsOf(
    'a{color:red}\nb{color:blue}\nc{top:0}'
  );
  const second = root.nodes[1];
  const first = records.links.firstChild(records.root.index);
  const middle = records.links.nextSibling(first);
  records.rule(middle).before = '\n\n';
  removeRules({ records }, new Set([records.links.nextSibling(middle)]));
  writeBack(records);
  assert.equal(second.raws.before, '\n\n');
});

/**
 * The records of two rules whose second record holds whitespace that no edit of
 * the children accompanies.
 */
function recordEditedAlone() {
  const { root, records } = whitespaceRecordsOf('a{color:red}\nb{color:blue}');
  records.rule(
    records.links.nextSibling(records.links.firstChild(records.root.index))
  ).before = '\n\n';
  writeBack(records);
  return { root, records };
}

// Every change of whitespace comes with a change of children; a record edited
// alone is a broken invariant.
test('write-back leaves the whitespace of a rule in a container it does not rebuild as it is', () => {
  const { root } = recordEditedAlone();
  assert.equal(root.last.raws.before, '\n');
});

test('the consistency check reports a record whose whitespace write-back did not write', () => {
  const { records } = recordEditedAlone();
  const enabled = consistencyChecksEnabled();
  enableConsistencyChecks(true);
  try {
    assert.throws(() => assertRecordsMatchTree(records));
  } finally {
    enableConsistencyChecks(enabled);
  }
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
  removeRules({ records }, new Set([records.links.firstChild(media.index)]));
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

test('a merged rule prints the four raws of the rule it was merged from, unminified', () => {
  const root = postcss.parse(
    'a{color:red;width:1px}\nb  /*x*/ {color:red;height:2px}  ;\n'
  );
  transformPass('mergeRules')(root, resolveTargets({}, undefined));
  assert.equal(
    root.toString(),
    'a{width:1px}\na,b  /*x*/ {color:red}  ;\nb  /*x*/ {height:2px}  ;\n'
  );
});

test('a rule merged again prints the raws of the rule its first merge took them from', () => {
  const root = postcss.parse(
    'c{width:1px;\nwidth:1px;\ncolor:red\n}\nb {color:red; top:0}\nc /*k*/ {top:0;\ntop:0;\ncolor:red}'
  );
  transformPass('mergeRules')(root, resolveTargets({}, undefined));
  assert.equal(
    root.toString(),
    'c{width:1px;\nwidth:1px\n}\nc,b,c /*k*/ {\ncolor:red}\nb,c,c /*k*/ {\ntop:0}'
  );
});
