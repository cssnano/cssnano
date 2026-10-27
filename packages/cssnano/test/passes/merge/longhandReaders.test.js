import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { walkStylesheet } = await import('../../../src/pipeline/traversal.js');
const { TextTable } = await import('../../../src/values/textTable.js');
const { foldShorthandDeclaration } =
  await import('../../../src/passes/merge/lib/longhand/minifyShorthand.js');
const { boxBrowserKeeps } =
  await import('../../../src/passes/merge/lib/longhand/validateBox.js');
const { isColor, isValidWidthStyleColor } =
  await import('../../../src/passes/merge/lib/longhand/validateWsc.js');
const { isUnresolved } =
  await import('../../../src/passes/merge/lib/longhand/unresolved.js');
const { default: isCustomProp } =
  await import('../../../src/passes/merge/lib/longhand/isCustomProp.js');
const { componentRanges } =
  await import('../../../src/passes/merge/lib/longhand/componentRanges.js');
const { default: cssnanoUtils } = await import('../../../src/utils/index.js');
const { tokenStart, tokenEnd } = cssnanoUtils;
const { default: parseWidthStyleColor } =
  await import('../../../src/passes/merge/lib/longhand/parseWsc.js');
const { discardOverriddenDeclarations } =
  await import('../../../src/passes/merge/lib/longhand/decl/overriddenDeclarations.js');
const { requiredSupport } =
  await import('../../../src/passes/merge/lib/longhand/isFallback.js');
const { isValidColumns } =
  await import('../../../src/passes/merge/lib/longhand/decl/columnsValue.js');
const { alignmentProperties, parseAlignmentDeclaration } =
  await import('../../../src/passes/merge/lib/longhand/decl/alignmentForms.js');
const { parseRadiusShorthand } =
  await import('../../../src/passes/merge/lib/longhand/validateRadius.js');
const { pairFamilies } =
  await import('../../../src/passes/merge/lib/longhand/decl/pairForms.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

const helpers = { result: { warn() {} } };

/**
 * Parses the stylesheet and gives each declaration value a token list through
 * the host walk's value stage, as the default preset does before merge runs.
 *
 * @param {string} css
 * @return {{root: import('postcss').Root, table: InstanceType<typeof TextTable>}}
 */
function walkedStylesheet(css) {
  const root = postcss.parse(css);
  const table = new TextTable();
  const stage = { forProperty: () => (buffer) => buffer.tokens() };
  walkStylesheet([stage], root, helpers, new Map(), table);
  return { root, table };
}

suite('the longhand readers take a declaration from the text table', () => {
  test("splitValue reads the declaration's tokens through the table, without tokenizing", () => {
    const { root, table } = walkedStylesheet('a{transition:opacity 0s ease}');
    const decl = root.first.first;
    const before = tokenizeTotal();
    foldShorthandDeclaration(decl, new Map(), 'transition', table);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("validateBox types each function component from the declaration's stored tokens, without tokenizing", () => {
    const { root, table } = walkedStylesheet('a{margin:calc(1px + 2px) 0}');
    const decl = root.first.first;
    const list = table.tokens(decl);
    const before = tokenizeTotal();
    boxBrowserKeeps('margin', decl.value, list);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("unresolved reads a component's range from the table, without tokenizing", () => {
    const { root, table } = walkedStylesheet('a{border:calc(1px) solid red}');
    const list = table.tokens(root.first.first);
    const [start, end] = componentRanges(list);
    const before = tokenizeTotal();
    assert.equal(isUnresolved(list, start, end), true);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('isCustomProp reads the value from the table, without tokenizing', () => {
    const { root, table } = walkedStylesheet('a{margin:var(--x) 1px}');
    const decl = root.first.first;
    const before = tokenizeTotal();
    assert.equal(isCustomProp(decl, table), true);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("isColor reads the color component's range from the table, without tokenizing", () => {
    const { root, table } = walkedStylesheet('a{border:1px solid rgb(0 0 0)}');
    const list = table.tokens(root.first.first);
    const ranges = componentRanges(list);
    const last = ranges.length - 2;
    const text = root.first.first.value.slice(
      tokenStart(list[ranges[last]]),
      tokenEnd(list[ranges[last + 1] - 1])
    );
    const before = tokenizeTotal();
    assert.equal(isColor(text, list, ranges[last], ranges[last + 1]), true);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("isValidWidthStyleColor reads the parser's slots, without tokenizing", () => {
    const parsed = parseWidthStyleColor('1px solid rgb(0 0 0)');
    const before = tokenizeTotal();
    isValidWidthStyleColor(parsed);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('shapeEquivalence reads the declaration from the table, without tokenizing', () => {
    const { root, table } = walkedStylesheet('a{margin:0 1px;margin:0 2px}');
    const before = tokenizeTotal();
    discardOverriddenDeclarations(root.first, table);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('requiredSupport reads the list stored for the node, without tokenizing', () => {
    const { root, table } = walkedStylesheet('a{width:7dvh}');
    const before = tokenizeTotal();
    requiredSupport(root.first.first, table);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('isValidColumns reads the list stored for the node, without tokenizing', () => {
    const { root, table } = walkedStylesheet('a{columns:2 100px}');
    const before = tokenizeTotal();
    assert.equal(isValidColumns(root.first.first, table), true);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('alignmentForms reads the list stored for the node, without tokenizing', () => {
    const { root, table } = walkedStylesheet('a{align-content:safe center}');
    const decl = root.first.first;
    const family = alignmentProperties.get('align-content');
    const before = tokenizeTotal();
    parseAlignmentDeclaration(family, decl, table);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('alignmentForms tokenizes decl.value once when PostCSS stripped a comment, since the stored list spells the comment', () => {
    const { root, table } = walkedStylesheet(
      'a{align-content:safe /* x */ center}'
    );
    const decl = root.first.first;
    const family = alignmentProperties.get('align-content');
    const before = tokenizeTotal();
    parseAlignmentDeclaration(family, decl, table);
    assert.equal(tokenizeTotal() - before, 1);
  });

  test('parseRadiusShorthand reads the list stored for the node, without tokenizing', () => {
    const { root, table } = walkedStylesheet('a{border-radius:1px 2px}');
    const decl = root.first.first;
    const before = tokenizeTotal();
    assert.notEqual(parseRadiusShorthand(decl.value, table.tokens(decl)), null);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('a pair family parser reads the list stored for the node, without tokenizing', () => {
    const { root, table } = walkedStylesheet('a{row-gap:1px}');
    const decl = root.first.first;
    const gap = pairFamilies.find((family) => family.shorthand === 'gap');
    const before = tokenizeTotal();
    assert.equal(gap.parseValue[0](decl, table), '1px');
    assert.equal(tokenizeTotal() - before, 0);
  });
});
