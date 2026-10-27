import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { walkStylesheet } = await import('../../src/pipeline/traversal.js');
const { TextTable } = await import('../../src/values/textTable.js');
const { ident, integer } =
  await import('../../src/values/tokenConstructors.js');
const { tokens } = await import('../../src/utils/value.js');
const { walkAfterMerge } = await import('../../src/pipeline/afterMerge.js');
const { discardUnusedSymbols } =
  await import('../../src/plugins/postcss-discard-unused/index.js');
const { foldShorthandDeclaration } =
  await import('../../src/passes/merge/lib/longhand/minifyShorthand.js');
const { reduceBorderRadius } =
  await import('../../src/passes/merge/lib/longhand/decl/borderRadiusReducer.js');
const { partitionLanes } =
  await import('../../src/passes/merge/lib/longhand/decl/radiusDescriptors.js');
const { applyChildEdits } =
  await import('../../src/passes/merge/lib/deferredChildEdits.js');
const { discardOverriddenInList } =
  await import('../../src/passes/merge/lib/longhand/decl/overriddenDeclarations.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

const helpers = { result: { warn() {} } };

suite('the text table reads the text the host walk wrote', () => {
  test('the table reads the selector the host walk wrote, without tokenizing', () => {
    const root = postcss.parse('a, b {}');
    const table = new TextTable();
    const stage = {
      selector: (buffer) => buffer.replace(0, 1, [ident('z')]),
    };
    walkStylesheet([stage], root, helpers, new Map(), table);
    const rule = root.first;
    assert.equal(rule.selector, 'z, b');
    const before = tokenizeTotal();
    const list = table.tokens(rule);
    assert.equal(tokenizeTotal() - before, 0);
    assert.equal(list.map((token) => token[1]).join(''), 'z, b');
  });
  test('the table reads the selector the host walk left unchanged, without tokenizing', () => {
    const root = postcss.parse('a, b {}');
    const table = new TextTable();
    const stage = { selector: (buffer) => buffer.tokens() };
    walkStylesheet([stage], root, helpers, new Map(), table);
    const rule = root.first;
    assert.equal(rule.selector, 'a, b');
    const before = tokenizeTotal();
    assert.equal(table.tokens(rule).length, 4);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('the table reads the selector the memo served to the host walk, without tokenizing', () => {
    const root = postcss.parse('a, b {} a, b {}');
    const table = new TextTable();
    const stage = {
      selector: (buffer) => buffer.replace(0, 1, [ident('z')]),
    };
    walkStylesheet([stage], root, helpers, new Map(), table);
    const second = root.nodes[1];
    assert.equal(second.selector, 'z, b');
    const before = tokenizeTotal();
    assert.equal(table.tokens(second).length, 4);
    assert.equal(tokenizeTotal() - before, 0);
  });
});

suite('the text table reads the value the host walk stored', () => {
  test("a reader takes the value list the host walk's stages read, without tokenizing", () => {
    const root = postcss.parse('a { margin: 0 1px }');
    const table = new TextTable();
    const stage = {
      forProperty: () => (buffer) => buffer.replace(0, 1, [integer(1)]),
    };
    walkStylesheet([stage], root, helpers, new Map(), table);
    const decl = root.first.first;
    assert.equal(decl.value, '1 1px');
    const before = tokenizeTotal();
    assert.equal(table.tokens(decl).length, 3);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('two declarations of one property in one context that spell one value share one table entry', () => {
    const root = postcss.parse('a { margin: 0 1px } b { margin: 0 1px }');
    const table = new TextTable();
    const stage = {
      forProperty: () => (buffer) => buffer.replace(0, 1, [integer(1)]),
    };
    walkStylesheet([stage], root, helpers, new Map(), table);
    const [first, second] = [root.first.first, root.last.first];
    const list = table.stored(first);
    assert.notEqual(list, undefined);
    assert.equal(table.stored(second), list);
  });
});

suite('the host walk shares one token list per text', () => {
  test('two properties that spell one value share one token list', () => {
    const root = postcss.parse('a { margin: 0 1px } b { padding: 0 1px }');
    const table = new TextTable();
    const stage = {
      forProperty: () => (buffer) => buffer.replace(0, 1, [integer(1)]),
    };
    walkStylesheet([stage], root, helpers, new Map(), table);
    const [first, second] = [root.first.first, root.last.first];
    const list = table.stored(first);
    assert.notEqual(list, undefined);
    assert.equal(table.stored(second), list);
  });

  test("a value's stages read the list another property's value left, without tokenizing", () => {
    const root = postcss.parse('a { margin: 0 1px } b { padding: 0 1px }');
    const table = new TextTable();
    const stage = {
      forProperty: () => (buffer) => buffer.tokens(),
    };
    const before = tokenizeTotal();
    walkStylesheet([stage], root, helpers, new Map(), table);
    assert.equal(tokenizeTotal() - before, 1);
  });

  test('a unicode-range value does not take a list read in the default mode', () => {
    const root = postcss.parse(
      'a { color: u+0-7f } b { unicode-range: u+0-7f }'
    );
    const table = new TextTable();
    const seen = [];
    const stage = {
      forProperty: () => (buffer) => {
        seen.push(buffer.tokens().length);
      },
    };
    walkStylesheet([stage], root, helpers, new Map(), table);
    assert.equal(seen[1], 1);
  });
});

suite('the text table reads the text the afterMerge walk wrote', () => {
  test('uniqueSelectors reads the selector tokens merge wrote, without tokenizing', () => {
    const root = postcss.parse('a, b {}');
    const table = new TextTable();
    const rule = root.first;
    table.write(rule, tokens('b, a, b'));
    const before = tokenizeTotal();
    walkAfterMerge(
      root,
      helpers.result,
      new Map([['uniqueSelectors', {}]]),
      new Map(),
      table
    );
    assert.equal(tokenizeTotal() - before, 0);
    assert.equal(rule.selector, ' a,b');
  });

  test("discard-unused's namespace prefixes read the selector uniqueSelectors wrote, without tokenizing", () => {
    const root = postcss.parse('ns|a, b, ns|a {}');
    const table = new TextTable();
    const rule = root.first;
    table.write(rule, tokens('ns|a, b, ns|a'));
    const symbols = new Map([
      ['discardUnused', { transform: discardUnusedSymbols, options: {} }],
    ]);
    const before = tokenizeTotal();
    walkAfterMerge(
      root,
      helpers.result,
      new Map([['uniqueSelectors', {}]]),
      symbols,
      table
    );
    assert.equal(tokenizeTotal() - before, 0);
    assert.equal(rule.selector, ' b,ns|a');
  });
});

suite('the text table reads the text the merge longhand writers wrote', () => {
  test('overriddenDeclarations reads the text minifyShorthand wrote, without tokenizing', () => {
    const root = postcss.parse('a { gap: 1px 1px; gap: 2px }');
    const table = new TextTable();
    const nodes = root.first.nodes;
    foldShorthandDeclaration(nodes[0], undefined, 'gap', table);
    table.tokens(nodes[1]);
    const before = tokenizeTotal();
    discardOverriddenInList(nodes, table);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("minifyShorthand's edited tokens spell text()", () => {
    const root = postcss.parse('a { gap: 1px 1px }');
    const table = new TextTable();
    const decl = root.first.first;
    foldShorthandDeclaration(decl, undefined, 'gap', table);
    assert.deepEqual(
      table.stored(decl)?.map((token) => token.slice(0, 4)),
      tokens(decl.value).map((token) => token.slice(0, 4))
    );
  });

  test('foldShorthandDeclaration reads the text it wrote, without tokenizing', () => {
    const root = postcss.parse('a { gap: 1px 1px }');
    const table = new TextTable();
    const decl = root.first.first;
    foldShorthandDeclaration(decl, undefined, 'gap', table);
    const before = tokenizeTotal();
    foldShorthandDeclaration(decl, undefined, 'gap', table);
    assert.equal(tokenizeTotal() - before, 0);
  });
});

suite(
  'the border-radius reader reads the text the border-radius writer wrote',
  () => {
    test('radiusDescriptors reads the text borderRadiusReducer wrote, without tokenizing', () => {
      const root = postcss.parse('a { border-radius: 1px 1px }');
      const table = new TextTable();
      const rule = root.first;
      const nodes = [...rule.nodes];
      reduceBorderRadius(rule, nodes, [nodes, []], table);
      assert.equal(rule.first.value, '1px');
      const before = tokenizeTotal();
      partitionLanes(rule, [rule.nodes, []], table);
      assert.equal(tokenizeTotal() - before, 0);
    });

    test("borderRadiusReducer's edited tokens spell text()", () => {
      const root = postcss.parse(
        'a { border-radius: 1px 2px 1px 2px / 3px 4px }'
      );
      const table = new TextTable();
      const rule = root.first;
      const nodes = [...rule.nodes];
      reduceBorderRadius(rule, nodes, [nodes, []], table);
      const decl = rule.first;
      assert.deepEqual(
        table.stored(decl)?.map((token) => token.slice(0, 4)),
        tokens(decl.value).map((token) => token.slice(0, 4))
      );
    });

    test("borderRadiusReducer's edited corner tokens spell text()", () => {
      const root = postcss.parse('a { border-top-left-radius: 1px 1px }');
      const table = new TextTable();
      const rule = root.first;
      const nodes = [...rule.nodes];
      reduceBorderRadius(rule, nodes, [nodes, []], table);
      const decl = rule.first;
      assert.deepEqual(
        table.stored(decl)?.map((token) => token.slice(0, 4)),
        tokens(decl.value).map((token) => token.slice(0, 4))
      );
    });

    test("borderRadiusReducer's rewritten shorthand tokens spell text()", () => {
      const root = postcss.parse(
        'a { border-radius: 1px 2px 1px 2px / 3px 4px; border-top-left-radius: 5px !important }'
      );
      const table = new TextTable();
      const rule = root.first;
      const nodes = [...rule.nodes];
      const lanes = [
        nodes.filter((node) => !node.important),
        nodes.filter((node) => node.important),
      ];
      reduceBorderRadius(rule, nodes, lanes, table);
      const decl = rule.first;
      assert.deepEqual(
        table.stored(decl)?.map((token) => token.slice(0, 4)),
        tokens(decl.value).map((token) => token.slice(0, 4))
      );
    });

    test("borderRadiusReducer's merged tokens spell text()", () => {
      const root = postcss.parse(
        'a { border-top-left-radius: 1px; border-top-right-radius: 2px; border-bottom-right-radius: 1px; border-bottom-left-radius: 2px }'
      );
      const table = new TextTable();
      const rule = root.first;
      const nodes = [...rule.nodes];
      reduceBorderRadius(rule, nodes, [nodes, []], table);
      applyChildEdits(rule);
      const merged = rule.nodes.find((node) => node.prop === 'border-radius');
      assert.deepEqual(
        table.stored(merged)?.map((token) => token.slice(0, 4)),
        tokens(merged.value).map((token) => token.slice(0, 4))
      );
    });
  }
);
