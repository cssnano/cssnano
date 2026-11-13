import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import {
  createRecordSymbolLists,
  isRecordAttached,
  recordSymbolVisit,
} from '../../src/pipeline/symbolLists.js';
import { createRunContext } from '../../src/passes/ir/runContext.js';
import { runDriver } from '../../src/passes/ir/runDriver.js';
import { discardEmptyRecords } from '../../src/passes/ir/discardRecords.js';
import { nodeOf } from '../../src/passes/ir/nodeTable.js';
import { remove } from '../../src/passes/ir/treeEdits.js';

/**
 * @typedef {Record<string, string[]>} TextLists the text of each entry, by list
 */

/**
 * @param {Record<string, readonly {toString(): string}[]>} lists
 * @returns {TextLists}
 */
function textsOf(lists) {
  /** @type {TextLists} */
  const texts = {};
  for (const [name, nodes] of Object.entries(lists)) {
    texts[name] = nodes.map((node) => node.toString());
  }
  return texts;
}

/**
 * The same walk over the records. The texts are read from the build's nodes,
 * which the walk left as it found them.
 * @param {string} css
 */
function collectRecords(css) {
  const root = postcss.parse(css);
  const context = createRunContext(undefined, true);
  const state = runDriver.build(root, context);
  const lists = createRecordSymbolLists();
  discardEmptyRecords(state.records, context, (index) =>
    recordSymbolVisit(state.records, context.tokenLists, lists, index)
  );
  /** @type {Record<string, import('postcss').AnyNode[]>} */
  const nodes = {};
  for (const [name, indices] of Object.entries(lists)) {
    nodes[name] = indices.map((index) => nodeOf(state.nodes, index));
  }
  runDriver.end(state, { browsers: [], folded: false });
  return { root, lists: textsOf(nodes) };
}

const forms = [['records', collectRecords]];

for (const [form, collect] of forms) {
  describe(`${form} symbol lists`, () => {
    test('collects a @font-face block', () => {
      const { lists } = collect('@font-face{font-family:a;src:url(a)}');
      assert.deepEqual(lists.fontFaces, [
        '@font-face{font-family:a;src:url(a)}',
      ]);
    });

    test('leaves a bodiless @font-face out of the font face list', () => {
      const { lists } = collect('@font-face;');
      assert.deepEqual(lists.fontFaces, []);
    });

    test('collects an empty @font-face block, which discardEmpty removes first', () => {
      const { lists } = collect('@font-face{}');
      assert.deepEqual(lists.fontFaces, []);
    });

    test('collects counter-style and keyframes at-rules, vendor prefix allowed', () => {
      const { lists } = collect(
        '@counter-style a{system:cyclic}@-webkit-keyframes b{from{top:0}}@keyframes c{from{top:0}}'
      );
      assert.deepEqual(lists.counterStyles, [
        '@counter-style a{system:cyclic}',
      ]);
      assert.deepEqual(lists.keyframes, [
        '@-webkit-keyframes b{from{top:0}}',
        '@keyframes c{from{top:0}}',
      ]);
    });

    test('collects @namespace at-rules', () => {
      const { lists } = collect(
        '@namespace svg url(http://www.w3.org/2000/svg);'
      );
      assert.deepEqual(lists.namespaces, [
        '@namespace svg url(http://www.w3.org/2000/svg)',
      ]);
    });

    test('collects only rules whose selector has a namespace bar', () => {
      const { lists } = collect('svg|a{color:red}a{color:red}');
      assert.deepEqual(lists.namespaceRules, ['svg|a{color:red}']);
    });

    test('collects font decls of rules, not those of a @font-face', () => {
      const { lists } = collect('a{font-family:x}@font-face{font-family:y}');
      assert.deepEqual(lists.fontDecls, ['font-family:x']);
    });

    test('collects list-style and system decls', () => {
      const { lists } = collect('a{list-style:b;system:cyclic}');
      assert.deepEqual(lists.listStyleDecls, ['list-style:b', 'system:cyclic']);
    });

    test('collects animation decls, vendor prefix allowed', () => {
      const { lists } = collect('a{animation:b 1s;-webkit-animation-name:c}');
      assert.deepEqual(lists.animationDecls, [
        'animation:b 1s',
        '-webkit-animation-name:c',
      ]);
    });

    test('collects z-index decls whatever the case of the property', () => {
      const { lists } = collect('a{Z-INDEX:1}b{z-index:2}');
      assert.deepEqual(lists.zIndexDecls, ['Z-INDEX:1', 'z-index:2']);
    });

    test('does not collect a node that discardEmpty removed', () => {
      const { lists } = collect('@font-face{}a{}');
      assert.deepEqual(lists.fontFaces, []);
    });

    test('leaves the stylesheet unchanged', () => {
      const css = '@font-face{font-family:a}a{font:b;z-index:1}';
      const { root } = collect(css);
      assert.equal(root.toString(), css);
    });

    test('gives each run its own lists', () => {
      const first = collect('a{z-index:1}').lists;
      const second = collect('b{z-index:2}').lists;
      assert.equal(first.zIndexDecls.length, 1);
      assert.equal(second.zIndexDecls.length, 1);
    });
  });
}

/**
 * Builds `@media print{@keyframes a{0%{top:0}}}` and returns its indices.
 */
function mediaRecords() {
  const root = postcss.parse('@media print{@keyframes a{0%{top:0}}}');
  const context = createRunContext(undefined, true);
  const state = runDriver.build(root, context);
  const { links, root: stylesheet } = state.records;
  const media = links.firstChild(stylesheet.index);
  const keyframes = links.firstChild(media);
  return { state, media, keyframes };
}

describe('isRecordAttached', () => {
  test('reports an entry that hangs from the root', () => {
    const { state, keyframes } = mediaRecords();
    assert.equal(isRecordAttached(state.records, keyframes), true);
  });

  test('reports an entry whose removed ancestor no longer reaches the root', () => {
    const { state, media, keyframes } = mediaRecords();
    remove(state.records, media);
    assert.equal(isRecordAttached(state.records, keyframes), false);
  });
});
