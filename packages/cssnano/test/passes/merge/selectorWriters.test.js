import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { mergePass, transformPass } =
  await import('../../../src/passes/merge/index.js');
const { removeRules, takePlaceOf } =
  await import('../../../src/passes/ir/treeEdits.js');
const { buildRecords } = await import('../../../src/passes/ir/buildRecords.js');
const { assertRecordsMatchTree } =
  await import('../../../src/passes/ir/treeMatch.js');
const { writeBack } = await import('../../../src/passes/ir/writeBack.js');
const { addSelectors } = await import('../../../src/passes/ir/selectorList.js');
const { createRunContext } =
  await import('../../../src/passes/ir/runContext.js');
const { resolveTargets } = await import('../../../src/utils/browserTargets.js');

/**
 * @param {import('postcss').Root} root
 * @return {number} the distinct declaration values of the stylesheet, which the
 * build tokenizes once each, since the host walk gives only selectors a list
 */
function distinctValuesOf(root) {
  const values = new Set();
  root.walkDecls((decl) => values.add(decl.value));
  return values.size;
}

/**
 * @param {import('postcss').Root} root
 * @return {number} the distinct written selectors of the stylesheet, which the
 * build tokenizes once each as whole selectors, since the walk leaves a rule's
 * selector to the records
 */
function distinctSelectorsOf(root) {
  const selectors = new Set();
  root.walkRules((rule) => selectors.add(rule.selector));
  return selectors.size;
}

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

/**
 * Parses the stylesheet, the input of the merge pass.
 *
 * @param {string} css
 * @return {{root: import('postcss').Root}}
 */
function walkedStylesheet(css) {
  return { root: postcss.parse(css) };
}

/**
 * The distinct selector items of every rule in the stylesheet. The build of
 * the records tokenizes each one once, so a pass counts this many calls for
 * its build alone.
 *
 * @param {import('postcss').Root} root
 * @return {number}
 */
function distinctItemsOf(root) {
  const items = new Set();
  root.walkRules((rule) => {
    for (const item of rule.selectors) items.add(item);
  });
  return items.size;
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

suite(
  'the merge pass leaves the selectors it writes as the rules read them',
  () => {
    test('a rule that merge joins with another reads its selector list without tokenizing', () => {
      const { root } = walkedStylesheet('a {color:red} b {color:red}');
      mergePass(root, resolveTargets({}, undefined), {}, undefined);
      const joined = ruleWith(root, 'a,b');
      const before = tokenizeTotal();
      assert.equal(joined.selector, 'a,b');
      assert.equal(tokenizeTotal() - before, 0);
    });

    test('a shared rule that merge builds from two selector lists reads its list without tokenizing', () => {
      const { root } = walkedStylesheet(
        'a, c {color:red;margin:0} b {color:red;padding:0}'
      );
      mergePass(root, resolveTargets({}, undefined), {}, undefined);
      const shared = ruleWith(root, 'a,c,b');
      const before = tokenizeTotal();
      assert.equal(shared.selector, 'a,c,b');
      assert.equal(tokenizeTotal() - before, 0);
    });

    test('a rule that merge clones with its selector list keeps the separator of the source, and merge reads its list without tokenizing', () => {
      const { root } = walkedStylesheet(
        'a, c {color:red;margin:0} b {color:red;padding:0}'
      );
      const items = distinctItemsOf(root);
      const selectors = distinctSelectorsOf(root);
      const before = tokenizeTotal();
      mergePass(root, resolveTargets({}, undefined), {}, undefined);
      ruleWith(root, 'a, c');
      assert.equal(
        tokenizeTotal() - before,
        items + distinctValuesOf(root) + selectors
      );
    });

    test('a rule that a later rule joins by repeating its declarations reads its grown selector list without tokenizing', () => {
      const { root } = walkedStylesheet(
        'a {color:red} p {margin:0} b {color:red}'
      );
      mergePass(root, resolveTargets({}, undefined), {}, undefined);
      const group = ruleWith(root, 'a,b');
      const before = tokenizeTotal();
      assert.equal(group.selector, 'a,b');
      assert.equal(tokenizeTotal() - before, 0);
    });

    test('elementKeys reads the selector merge.js wrote, without tokenizing', () => {
      const { root } = walkedStylesheet(
        'div > a {color:red} div > b {color:red} p {margin:0} div > c {color:red}'
      );
      const items = distinctItemsOf(root);
      const selectors = distinctSelectorsOf(root);
      const before = tokenizeTotal();
      mergePass(root, resolveTargets({}, undefined), {}, undefined);
      assert.equal(
        tokenizeTotal() - before,
        items + distinctValuesOf(root) + selectors
      );
    });

    test('elementKeys reads the selector declarationJoin.js wrote, without tokenizing', () => {
      const { root } = walkedStylesheet(
        'div > a {color:red} p {margin:0} div > b {color:red}'
      );
      const items = distinctItemsOf(root);
      const selectors = distinctSelectorsOf(root);
      const before = tokenizeTotal();
      mergePass(root, resolveTargets({}, undefined), {}, undefined);
      assert.equal(
        tokenizeTotal() - before,
        items + distinctValuesOf(root) + selectors
      );
    });

    test('elementKeys reads the selector ruleRewrite.js wrote, without tokenizing', () => {
      const { root } = walkedStylesheet(
        'div > a, div > c {color:red;margin:0} div > b {color:red;padding:0} div > d {color:red}'
      );
      const items = distinctItemsOf(root);
      const selectors = distinctSelectorsOf(root);
      const before = tokenizeTotal();
      mergePass(root, resolveTargets({}, undefined), {}, undefined);
      assert.equal(
        tokenizeTotal() - before,
        items + distinctValuesOf(root) + selectors
      );
    });
  }
);

suite('the merge pass writes selectors through its records', () => {
  test('a merged rule whose selector changed spells its new selector', () => {
    const root = postcss.parse('a {color:red} b {color:red}');
    mergePass(root, resolveTargets({}, undefined), {}, undefined);
    assert.equal(ruleWith(root, 'a,b').selector, 'a,b');
  });

  test('a marked record prints the comment that its selector items keep', () => {
    const root = postcss.parse('a /*x*/, c {color:red}');
    const context = createRunContext();
    const { records, nodes } = buildRecords(root, context);
    const rule = records.rule(records.links.firstChild(records.root.index));
    addSelectors(records, rule.index, [], context.tokenLists, []);
    writeBack(records, nodes, context.tokenLists);
    assert.equal(root.toString(), 'a /*x*/,c {color:red}');
  });

  test('a rewritten selector prints its new text, not the raw that kept the comment', () => {
    const root = postcss.parse('a /*x*/ ,b{color:red}');
    const context = createRunContext();
    const { records, nodes } = buildRecords(root, context);
    const rule = records.rule(records.links.firstChild(records.root.index));
    addSelectors(records, rule.index, [], context.tokenLists, []);
    records.entry(rule.index).writtenList = context.valueIds.idOf(
      context.tokenLists,
      undefined,
      'a  ,b'
    );
    writeBack(records, nodes, context.tokenLists);
    assert.equal(root.toString(), 'a  ,b{color:red}');
  });
});

/**
 * The records of `css`, built the way the driver builds them, with the rule
 * records of its first level in order.
 *
 * @param {string} css
 */
function whitespaceRecordsOf(css, consistencyChecks = false) {
  const root = postcss.parse(css);
  const context = createRunContext(consistencyChecks);
  const { records, nodes } = buildRecords(root, context);
  return { root, records, nodes, tokenLists: context.tokenLists };
}

test('write-back gives a rule the whitespace its record holds, in the stylesheet it rebuilds', () => {
  const { root, records, nodes, tokenLists } = whitespaceRecordsOf(
    'a{color:red}\nb{color:blue}\nc{top:0}'
  );
  const second = root.nodes[1];
  const first = records.links.firstChild(records.root.index);
  const middle = records.links.nextSibling(first);
  records.rule(middle).before = '\n\n';
  removeRules({ records }, new Set([records.links.nextSibling(middle)]));
  writeBack(records, nodes, tokenLists);
  assert.equal(second.raws.before, '\n\n');
});

/**
 * The records of two rules whose second record holds whitespace that no edit of
 * the children accompanies.
 */
function recordEditedAlone(consistencyChecks = false) {
  const { root, records, nodes, tokenLists } = whitespaceRecordsOf(
    'a{color:red}\nb{color:blue}',
    consistencyChecks
  );
  records.rule(
    records.links.nextSibling(records.links.firstChild(records.root.index))
  ).before = '\n\n';
  writeBack(records, nodes, tokenLists);
  return { root, records, nodes, tokenLists };
}

// Every change of whitespace comes with a change of children; a record edited
// alone is a broken invariant.
test('write-back writes the whitespace of a rule in a container it does not rebuild', () => {
  const { root } = recordEditedAlone();
  assert.equal(root.last.raws.before, '\n\n');
});

test('the consistency check reports a record whose whitespace write-back did not write', () => {
  // The arena fixes its checks when it is built, so it is built under checks.
  const { records, nodes, tokenLists } = recordEditedAlone(true);
  assert.throws(() => assertRecordsMatchTree(records, nodes, tokenLists));
});

test('write-back gives a rule nested in an at-rule the whitespace its record holds', () => {
  const { root, records, nodes, tokenLists } = whitespaceRecordsOf(
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
  writeBack(records, nodes, tokenLists);
  assert.equal(root.first.last.raws.before, '\n\n');
});

test('takePlaceOf gives the earlier record the whitespace of the later one, which write-back writes', () => {
  const { root, records, nodes, tokenLists } =
    whitespaceRecordsOf('a{}\n\nb{}\n');
  const earlier = records.rule(records.links.firstChild(records.root.index));
  const later = records.rule(
    records.links.nextSibling(records.links.firstChild(records.root.index))
  );
  takePlaceOf(records, earlier.index, later.index);
  assert.equal(earlier.before, '\n\n');
  writeBack(records, nodes, tokenLists);
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

test('write-back leaves the selector of a marked rule the root does not reach as it was', () => {
  const { records, nodes, tokenLists } = whitespaceRecordsOf(
    'a{color:red}b{color:red}'
  );
  const first = records.rule(records.links.firstChild(records.root.index));
  addSelectors(records, first.index, [], tokenLists, []);
  records.detach(first.index);
  writeBack(records, nodes, tokenLists);
  assert.equal(nodes[first.index].selector, 'a');
});
