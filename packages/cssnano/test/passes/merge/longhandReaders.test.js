import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../../util/countTokenize.js');
const { createRunContext } =
  await import('../../../src/passes/ir/runContext.js');
const { default: postcss } = await import('postcss');
const { tokens } = await import('../../../src/utils/value.js');
const { foldShorthandDeclaration } =
  await import('../../../src/passes/merge/lib/longhand/minifyShorthand.js');
const { readBlock } =
  await import('./lib/longhand/helpers/declarationItems.js');
const { buildRecords } = await import('../../../src/passes/ir/buildRecords.js');
const { declarationsFromRecords } =
  await import('../../../src/passes/merge/lib/longhand/recordDeclarations.js');
const { longstandingFeatures } =
  await import('../../../src/passes/ir/syntaxFeatures.js');
const { boxBrowserKeeps } =
  await import('../../../src/passes/merge/lib/longhand/validateBox.js');
const { isColor, isValidWidthStyleColor } =
  await import('../../../src/passes/merge/lib/longhand/validateWsc.js');
const { isUnresolved } = await import('../../../src/passes/ir/unresolved.js');
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

/**
 * Parses the stylesheet, the input of the build.
 *
 * @param {string} css
 * @return {{root: import('postcss').Root}}
 */
function walkedStylesheet(css) {
  return { root: postcss.parse(css) };
}

/**
 * The block of the rule's declarations, as the build reads it before a reader
 * runs.
 *
 * @param {import('postcss').Root} root
 */
function blockOf(root) {
  return readBlock(root.first, createRunContext()).list;
}

suite(
  'the longhand readers take a declaration without tokenizing it again',
  () => {
    test("splitValue reads the declaration's tokens without tokenizing", () => {
      const { root } = walkedStylesheet('a{transition:opacity 0s ease}');
      const list = blockOf(root);
      const before = tokenizeTotal();
      foldShorthandDeclaration(list, 0, 'transition');
      assert.equal(tokenizeTotal() - before, 0);
    });

    test('validateBox types each function component without tokenizing', () => {
      const { root } = walkedStylesheet('a{margin:calc(1px + 2px) 0}');
      const decl = root.first.first;
      const list = tokens(decl.value);
      const before = tokenizeTotal();
      boxBrowserKeeps('margin', decl.value, list);
      assert.equal(tokenizeTotal() - before, 0);
    });

    test("unresolved reads a component's range without tokenizing", () => {
      const { root } = walkedStylesheet('a{border:calc(1px) solid red}');
      const list = tokens(root.first.first.value);
      const [start, end] = componentRanges(list);
      const before = tokenizeTotal();
      assert.equal(isUnresolved(list, start, end), true);
      assert.equal(tokenizeTotal() - before, 0);
    });

    test('isCustomProp reads the value without tokenizing', () => {
      const { root } = walkedStylesheet('a{margin:var(--x) 1px}');
      const item = blockOf(root).at(0);
      const before = tokenizeTotal();
      assert.equal(isCustomProp(item), true);
      assert.equal(tokenizeTotal() - before, 0);
    });

    test("isColor reads the color component's range without tokenizing", () => {
      const { root } = walkedStylesheet('a{border:1px solid rgb(0 0 0)}');
      const list = tokens(root.first.first.value);
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

    test('shapeEquivalence reads the declaration without tokenizing', () => {
      const { root } = walkedStylesheet('a{margin:0 1px;margin:0 2px}');
      const list = blockOf(root);
      const before = tokenizeTotal();
      discardOverriddenDeclarations(list, longstandingFeatures);
      assert.equal(tokenizeTotal() - before, 0);
    });

    test('requiredSupport reads the list stored for the node, without tokenizing', () => {
      const { root } = walkedStylesheet('a{width:7dvh}');
      const item = blockOf(root).at(0);
      const before = tokenizeTotal();
      requiredSupport(item);
      assert.equal(tokenizeTotal() - before, 0);
    });

    test('isValidColumns reads the list stored for the node, without tokenizing', () => {
      const { root } = walkedStylesheet('a{columns:2 100px}');
      const item = blockOf(root).at(0);
      const before = tokenizeTotal();
      assert.equal(isValidColumns(item), true);
      assert.equal(tokenizeTotal() - before, 0);
    });

    test('alignmentForms reads the list stored for the node, without tokenizing', () => {
      const { root } = walkedStylesheet('a{align-content:safe center}');
      const item = blockOf(root).at(0);
      const family = alignmentProperties.get('align-content');
      const before = tokenizeTotal();
      parseAlignmentDeclaration(family, item);
      assert.equal(tokenizeTotal() - before, 0);
    });

    test('the block build tokenizes decl.value once when PostCSS stripped a comment, and the selector once', () => {
      const { root } = walkedStylesheet('a{align-content:safe /* x */ center}');
      const before = tokenizeTotal();
      blockOf(root);
      // Two selectors, one for `a` beside its items and one as written; the
      // value PostCSS cleaned; the value as written, which the build interns in
      // the property's mode; and the check for an important comment in it.
      assert.equal(tokenizeTotal() - before, 5);
    });

    test('one build of the records tokenizes a value repeated on another rule once, since the run interns the text', () => {
      const root = postcss.parse('a{margin:0 1px}b{margin:0 1px}');
      const run = createRunContext();
      const before = tokenizeTotal();
      const { records, nodes } = buildRecords(root, run);
      declarationsFromRecords(records, run, nodes.indexOf(root.first));
      declarationsFromRecords(records, run, nodes.indexOf(root.last));
      // Two selectors, each tokenized as written beside its items, and one value.
      assert.equal(tokenizeTotal() - before, 5);
    });

    test('parseRadiusShorthand reads the list stored for the node, without tokenizing', () => {
      const { root } = walkedStylesheet('a{border-radius:1px 2px}');
      const decl = root.first.first;
      const list = tokens(decl.value);
      const before = tokenizeTotal();
      assert.notEqual(parseRadiusShorthand(decl.value, list), null);
      assert.equal(tokenizeTotal() - before, 0);
    });

    test('a pair family parser reads the list stored for the node, without tokenizing', () => {
      const { root } = walkedStylesheet('a{row-gap:1px}');
      const item = blockOf(root).at(0);
      const gap = pairFamilies.find((family) => family.shorthand === 'gap');
      const before = tokenizeTotal();
      assert.equal(gap.parseValue[0](item), '1px');
      assert.equal(tokenizeTotal() - before, 0);
    });
  }
);
