import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { discardAndReport } from '#postcss-discard-empty';
import { TextTable } from '../../src/values/textTable.js';
import {
  createSymbolLists,
  isAttached,
  symbolVisit,
} from '../../src/pipeline/symbolLists.js';

/**
 * Walks the stylesheet the way the walk after merge does, and returns the
 * lists the visit filled.
 * @param {string} css
 */
function collect(css) {
  const root = postcss.parse(css);
  const lists = createSymbolLists();
  discardAndReport(
    root,
    /** @type {import('postcss').Result} */ ({ messages: [] }),
    symbolVisit(lists),
    new TextTable()
  );
  return { root, lists };
}

/** @param {import('postcss').AnyNode[]} nodes */
const texts = (nodes) => nodes.map((node) => node.toString());

describe('symbolVisit lists', () => {
  test('collects a @font-face block', () => {
    const { lists } = collect('@font-face{font-family:a;src:url(a)}');
    assert.deepEqual(texts(lists.fontFaces), [
      '@font-face{font-family:a;src:url(a)}',
    ]);
  });

  test('leaves a bodiless @font-face out of the font face list', () => {
    const { lists } = collect('@font-face;');
    assert.deepEqual(lists.fontFaces, []);
  });

  test('collects counter-style and keyframes at-rules, vendor prefix allowed', () => {
    const { lists } = collect(
      '@counter-style a{system:cyclic}@-webkit-keyframes b{from{top:0}}@keyframes c{from{top:0}}'
    );
    assert.deepEqual(texts(lists.counterStyles), [
      '@counter-style a{system:cyclic}',
    ]);
    assert.deepEqual(texts(lists.keyframes), [
      '@-webkit-keyframes b{from{top:0}}',
      '@keyframes c{from{top:0}}',
    ]);
  });

  test('collects @namespace at-rules', () => {
    const { lists } = collect(
      '@namespace svg url(http://www.w3.org/2000/svg);'
    );
    assert.deepEqual(texts(lists.namespaces), [
      '@namespace svg url(http://www.w3.org/2000/svg)',
    ]);
  });

  test('collects only rules whose selector has a namespace bar', () => {
    const { lists } = collect('svg|a{color:red}a{color:red}');
    assert.deepEqual(texts(lists.namespaceRules), ['svg|a{color:red}']);
  });

  test('collects font decls of rules, not those of a @font-face', () => {
    const { lists } = collect('a{font-family:x}@font-face{font-family:y}');
    assert.deepEqual(texts(lists.fontDecls), ['font-family:x']);
  });

  test('collects list-style and system decls', () => {
    const { lists } = collect('a{list-style:b;system:cyclic}');
    assert.deepEqual(texts(lists.listStyleDecls), [
      'list-style:b',
      'system:cyclic',
    ]);
  });

  test('collects animation decls, vendor prefix allowed', () => {
    const { lists } = collect('a{animation:b 1s;-webkit-animation-name:c}');
    assert.deepEqual(texts(lists.animationDecls), [
      'animation:b 1s',
      '-webkit-animation-name:c',
    ]);
  });

  test('collects z-index decls whatever the case of the property', () => {
    const { lists } = collect('a{Z-INDEX:1}b{z-index:2}');
    assert.deepEqual(texts(lists.zIndexDecls), ['Z-INDEX:1', 'z-index:2']);
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
    assert.notEqual(first, second);
  });
});

describe('isAttached', () => {
  test('reports a node that hangs from the root', () => {
    const root = postcss.parse('@media print{@keyframes a{0%{top:0}}}');
    const keyframes = /** @type {import('postcss').AtRule} */ (
      /** @type {import('postcss').AtRule} */ (root.first).first
    );
    assert.equal(isAttached(keyframes), true);
  });

  test('reports a node whose removed ancestor no longer reaches the root', () => {
    const root = postcss.parse('@media print{@keyframes a{0%{top:0}}}');
    const media = /** @type {import('postcss').AtRule} */ (root.first);
    const keyframes = /** @type {import('postcss').AtRule} */ (media.first);
    media.remove();
    assert.equal(isAttached(keyframes), false);
  });
});
